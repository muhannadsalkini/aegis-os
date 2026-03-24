import { useState, useRef, useCallback, useEffect } from 'react';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

interface UseVoiceAgentProps {
  apiUrl: string;
  /** Called once when the user's final transcript is confirmed */
  onUserMessage?: (text: string) => void;
  /** Called for each sentence the AI produces. isFirst=true on the opening sentence of a new turn. */
  onAssistantSentence?: (text: string, isFirst: boolean) => void;
  /** Called after each tool the AI executes */
  onToolCall?: (toolName: string, args: unknown, result: unknown) => void;
}

export function useVoiceAgent({ apiUrl, onUserMessage, onAssistantSentence, onToolCall }: UseVoiceAgentProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Core references
  const wsRef = useRef<WebSocket | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);

  // Audio references for perfect hardware scheduling
  const nextStartTimeRef = useRef(0);
  const playbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pcmLeftoverRef = useRef<Uint8Array | null>(null);
  const isPlayingRef = useRef(false);
  const serverIdleRef = useRef(false);
  const isAIActiveRef = useRef(false);
  /** Tracks whether the next reply event is the first sentence of a new AI turn */
  const isFirstSentenceRef = useRef(true);
  /** Stable refs for callbacks so we never re-render just because a callback identity changed */
  const onUserMessageRef = useRef(onUserMessage);
  const onAssistantSentenceRef = useRef(onAssistantSentence);
  const onToolCallRef = useRef(onToolCall);
  // Keep refs in sync without triggering re-renders
  onUserMessageRef.current = onUserMessage;
  onAssistantSentenceRef.current = onAssistantSentence;
  onToolCallRef.current = onToolCall;

  // Cleanup all audio resources
  const cleanup = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      mediaRecorderRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    if (sourceNodeRef.current) {
      sourceNodeRef.current.disconnect();
      sourceNodeRef.current = null;
    }

    if (audioContextRef.current) {
      // Don't close immediately if speaking, just suspend
      if (audioContextRef.current.state !== 'closed') {
        audioContextRef.current.close().catch(console.error);
      }
      audioContextRef.current = null;
    }

    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    nextStartTimeRef.current = 0;
    pcmLeftoverRef.current = null;
    isPlayingRef.current = false;
    serverIdleRef.current = false;
  }, []);

  // Component unmount cleanup
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  const initAudioContext = () => {
    if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return audioContextRef.current;
  };

  const queueAudioChunk = useCallback((buffer: ArrayBuffer) => {
    let newBytes = new Uint8Array(buffer);
    
    // Prepend any leftover byte from the previous chunk
    if (pcmLeftoverRef.current) {
      const combined = new Uint8Array(pcmLeftoverRef.current.length + newBytes.length);
      combined.set(pcmLeftoverRef.current);
      combined.set(newBytes, pcmLeftoverRef.current.length);
      newBytes = combined;
      pcmLeftoverRef.current = null;
    }

    // If the total length is odd, hold back the last byte
    if (newBytes.length % 2 !== 0) {
      pcmLeftoverRef.current = new Uint8Array([newBytes[newBytes.length - 1]]);
      newBytes = newBytes.slice(0, newBytes.length - 1);
    }

    if (newBytes.length > 0) {
      // 1. Create aligned buffer & convert to float32
      const alignedBuffer = newBytes.buffer.slice(newBytes.byteOffset, newBytes.byteOffset + newBytes.byteLength);
      const ctx = initAudioContext();
      
      const int16Data = new Int16Array(alignedBuffer);
      const float32Data = new Float32Array(int16Data.length);
      for (let i = 0; i < int16Data.length; i++) {
        float32Data[i] = int16Data[i] / 32768.0;
      }
      
      const audioBuffer = ctx.createBuffer(1, float32Data.length, 24000);
      audioBuffer.getChannelData(0).set(float32Data);

      // 2. Hardware schedule playback seamlessly
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(ctx.destination);

      if (nextStartTimeRef.current < ctx.currentTime) {
        nextStartTimeRef.current = ctx.currentTime;
      }

      source.start(nextStartTimeRef.current);
      nextStartTimeRef.current += audioBuffer.duration;

      // 3. Keep track of when final schedule drops
      isPlayingRef.current = true;
      if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
      
      const msUntilFinished = Math.max(0, (nextStartTimeRef.current - ctx.currentTime) * 1000);
      playbackTimerRef.current = setTimeout(() => {
        isPlayingRef.current = false;
        if (serverIdleRef.current) {
          // Backend uses `idle` to mean "AI finished, STT is ready".
          // UI must show `listening` so the user understands voice mode is active.
          setPartialTranscript('');
          setVoiceState('listening');
        }
      }, msUntilFinished);
    }
  }, [cleanup]);

  const startListening = useCallback(async () => {
    try {
      // Reset state
      setErrorMsg(null);
      setPartialTranscript('');
      cleanup();
      setVoiceState('listening');

      // 1. Request microphone permission
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      streamRef.current = stream;

      // 2. Setup AudioContext for Analyser (Waveform data)
      const ctx = initAudioContext();
      // Resume context if suspended (browser autoplay policy)
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }

      const sourceNode = ctx.createMediaStreamSource(stream);
      sourceNodeRef.current = sourceNode;
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      sourceNode.connect(analyser);
      analyserRef.current = analyser;

      // 3. Setup WebSocket connection to backend
      const wsUrl = new URL('/voice/ws', apiUrl);
      wsUrl.protocol = wsUrl.protocol === 'https:' ? 'wss:' : 'ws:';
      const ws = new WebSocket(wsUrl.toString());
      ws.binaryType = 'arraybuffer';
      wsRef.current = ws;

      ws.onopen = () => {
        // 4. Start recording once WS is open
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: 'audio/webm;codecs=opus',
        });
        mediaRecorderRef.current = mediaRecorder;

        // Fire data stream every 250ms
        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0 && ws.readyState === WebSocket.OPEN) {
            console.log(`Sending chunk: ${e.data.size} bytes`);
            ws.send(e.data);
          }
        };

        mediaRecorder.start(250);
      };

      ws.onmessage = async (e) => {
        // Binary frame = TTS Audio Chunk
        if (e.data instanceof ArrayBuffer) {
          if (!isAIActiveRef.current) {
             // Drop latency/jitter ghost chunks that arrive after the session was forcefully cut
             return;
          }
          console.log(`Received TTS chunk: ${e.data.byteLength} bytes`);
          queueAudioChunk(e.data);
          return;
        }

        // JSON frame = Server Event
        try {
          const msg = JSON.parse(e.data);
          console.log(`Server event:`, msg);
          if (msg.type === 'transcript') {
            // Partial speech — intentionally NOT shown in status bar.
            // The committed user bubble is added via 'user_message' event below.
            // (No UI update here — avoids showing half-words in the status bar)
          } else if (msg.type === 'user_message') {
            // Fired once when processUtterance starts — reliable for both
            // speechFinal AND silence-timer triggered turns
            onUserMessageRef.current?.(msg.text);
          } else if (msg.type === 'tts_start') {
            // A new ElevenLabs sentence stream is starting. Each sentence is an
            // independent PCM audio stream, so we MUST reset the leftover-byte cache
            // to avoid the first sample of this sentence being misaligned.
            pcmLeftoverRef.current = null;
          } else if (msg.type === 'reply') {
            // Each reply event carries one sentence from the streaming AI response
            const isFirst = isFirstSentenceRef.current;
            isFirstSentenceRef.current = false;
            // Show the current AI sentence in the status bar while speaking
            setPartialTranscript(msg.text);
            onAssistantSentenceRef.current?.(msg.text, isFirst);
          } else if (msg.type === 'tool_call') {
            onToolCallRef.current?.(msg.toolName, msg.args, msg.result);
          } else if (msg.type === 'state') {
            if (msg.state === 'thinking') {
              // Unconditionally purge any leftover byte from a previous generation stream
              pcmLeftoverRef.current = null;
              isAIActiveRef.current = true;
              // Reset so the next reply sentence is treated as the first
              isFirstSentenceRef.current = true;
            } else if (msg.state === 'speaking') {
              isAIActiveRef.current = true;
            } else {
              isAIActiveRef.current = false;
            }

            if (msg.state === 'listening' && isPlayingRef.current) {
               // Barge-in active: stop playback abruptly!
               if (playbackTimerRef.current) clearTimeout(playbackTimerRef.current);
               nextStartTimeRef.current = 0;
               isPlayingRef.current = false;
               pcmLeftoverRef.current = null;
               if (audioContextRef.current) {
                 audioContextRef.current.close().catch(console.error);
                 audioContextRef.current = null;
               }
            }

            if (msg.state === 'listening') {
              // We intentionally don't display STT partials in the status bar,
              // so clear any previously shown assistant sentence.
              setPartialTranscript('');
            }

            if (msg.state === 'idle') {
              serverIdleRef.current = true;
              if (!isPlayingRef.current) {
                // If playback already ended, transition immediately.
                setPartialTranscript('');
                setVoiceState('listening');
              }
            } else {
              serverIdleRef.current = false;
              setVoiceState(msg.state);
            }
          } else if (msg.type === 'error') {
            setErrorMsg(msg.message || 'Server returned an error');
            setVoiceState('error');
            cleanup();
          }
        } catch (err) {
          console.error('Failed to parse WS message:', err);
        }
      };

      ws.onerror = () => {
        setErrorMsg('WebSocket connection failed');
        setVoiceState('error');
        cleanup();
      };

      ws.onclose = () => {
        if (voiceState !== 'error' && voiceState !== 'idle') {
          setVoiceState('idle');
        }
      };

    } catch (err) {
      console.error('Mic error:', err);
      let errMsg = 'Could not access microphone';
      if (err instanceof Error && err.name === 'NotAllowedError') {
        errMsg = 'Microphone access denied';
      }
      setErrorMsg(errMsg);
      setVoiceState('error');
      cleanup();
    }
  }, [apiUrl, cleanup, queueAudioChunk, voiceState]);

  const stopSession = useCallback(() => {
    // Send stop signal if connected
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'stop' }));
    }
    
    // Unconditionally stop ongoing playback without relying on stale closure state
    nextStartTimeRef.current = 0;
    if (playbackTimerRef.current) {
      clearTimeout(playbackTimerRef.current);
      playbackTimerRef.current = null;
    }
    isPlayingRef.current = false;
    pcmLeftoverRef.current = null;
    
    if (audioContextRef.current) {
      audioContextRef.current.close().catch(console.error);
      audioContextRef.current = null;
    }

    setVoiceState('idle');
    cleanup();
  }, [cleanup]);

  // Utility to get audio frequency data for visualizing
  const getByteFrequencyData = useCallback(() => {
    if (!analyserRef.current) return new Uint8Array();
    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    analyserRef.current.getByteFrequencyData(dataArray);
    return dataArray;
  }, []);

  return {
    voiceState,
    partialTranscript,
    errorMsg,
    startListening,
    stopSession,
    getByteFrequencyData,
  };
}
