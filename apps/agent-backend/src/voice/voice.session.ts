import { EventEmitter } from 'node:events';
import { getDefaultAgent } from '../agents/index.js';
import type { ISttProvider } from './providers/stt.interface.js';
import type { ITtsProvider } from './providers/tts.interface.js';
import type { Message } from '../types/agent.js';
import { VOICE_CONFIG } from './voice.config.js';

export type VoiceState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

export interface VoiceSessionEvents {
  'state': (state: VoiceState) => void;
  'transcript': (payload: { text: string; isFinal: boolean }) => void;
  'userMessage': (payload: { text: string }) => void; // fired when processUtterance starts — guaranteed regardless of trigger
  'reply': (payload: { text: string }) => void;
  'ttsStart': () => void;
  'toolCall': (payload: { toolName: string; args: unknown; result: unknown }) => void;
  'audioChunk': (chunk: Buffer) => void;
  'error': (err: { code: string; message: string }) => void;
  'end': () => void;
}

export declare interface VoiceSession {
  on<K extends keyof VoiceSessionEvents>(event: K, listener: VoiceSessionEvents[K]): this;
  emit<K extends keyof VoiceSessionEvents>(event: K, ...args: Parameters<VoiceSessionEvents[K]>): boolean;
}

/**
 * VoiceSession
 *
 * Orchestrates one full voice turn:
 *   audio in → STT → agent.chat() → TTS → audio out
 */
export class VoiceSession extends EventEmitter {
  private sttProvider: ISttProvider;
  private ttsProvider: ITtsProvider;

  /** In-flight STT stream for the current utterance */
  private sttStream: Awaited<ReturnType<ISttProvider['createStream']>> | null = null;
  /** Promise to prevent concurrent STT stream creation */
  private sttStreamPromise: Promise<void> | null = null;

  /** Rolling conversation history kept for the duration of the WS connection */
  private conversationHistory: Message[] = [];

  /** Silence timer: triggers end-of-utterance if Deepgram stalls */
  private silenceTimer: NodeJS.Timeout | null = null;

  /** Current partial transcript (shown live in UI) */
  private partialTranscript = '';

  /** The locked-in accumulated text of previous finalized fragments of this utterance */
  private accumulatedUtterance = '';

  /** Set to true while we're processing (thinking / speaking) — gates new audio */
  private isBusy = false;
  private isInterrupted = false;
  /** AbortController for the in-flight chatStream call — abort() stops LLM/tool mid-execution */
  private abortController: AbortController | null = null;

  constructor(sttProvider: ISttProvider, ttsProvider: ITtsProvider) {
    super();
    this.sttProvider = sttProvider;
    this.ttsProvider = ttsProvider;
  }

  /** Called when a new audio chunk arrives from the browser */
  async handleAudioChunk(chunk: Buffer): Promise<void> {
    // Open the STT stream on first chunk
    if (!this.sttStream) {
      if (!this.sttStreamPromise) {
        this.sttStreamPromise = this.openSttStream().finally(() => {
          this.sttStreamPromise = null;
        });
      }
      await this.sttStreamPromise;
      if (!this.sttStream) return; // failed to open
    }

    this.sttStream.sendAudio(chunk);
  }

  /** Cleanly end the session (WS closed) */
  async close(): Promise<void> {
    this.clearSilenceTimer();
    if (this.sttStream) {
      this.sttStream.finish();
      this.sttStream = null;
    }
  }

  // ─── Private ──────────────────────────────────────────────────────────────

  private interrupt(): void {
    if (!this.isBusy) return;
    this.isBusy = false;
    this.isInterrupted = true;
    this.accumulatedUtterance = '';
    // Abort any in-flight LLM stream or tool execution immediately
    this.abortController?.abort();
    this.abortController = null;
    this.emit('state', 'listening' as VoiceState);
  }

  private async openSttStream(): Promise<void> {
    this.emit('state', 'listening' as VoiceState);
    this.accumulatedUtterance = '';

    try {
      this.sttStream = await this.sttProvider.createStream();
    } catch (err) {
      console.log(err)
      this.emitError('stt_failed', err instanceof Error ? err.message : 'STT stream failed to open');
      return;
    }

    this.sttStream.on('transcript', ({ text, isFinal, speechFinal }) => {
      if (!text) return;

      if (this.isBusy) {
        // BARGE-IN DETECTED
        this.interrupt();
      }

      const fullText = (this.accumulatedUtterance + ' ' + text).trim();
      this.partialTranscript = fullText;

      // Emit the combined string to the frontend
      this.emit('transcript', { text: fullText, isFinal: Boolean(speechFinal) });

      if (isFinal) {
        // A chunk was locked in! Append it forever.
        this.accumulatedUtterance += ' ' + text;
        this.accumulatedUtterance = this.accumulatedUtterance.trim();
        // Only reset silence timer on confirmed (isFinal) chunks — NOT on every
        // partial. Resetting on partials caused the 500ms timer to fire mid-word
        // and trigger processUtterance before the user finished speaking.
        this.resetSilenceTimer();
      }

      if (speechFinal) {
        // True silence detected — utterance complete!
        this.clearSilenceTimer();
        void this.processUtterance(this.accumulatedUtterance);
      }
    });

    this.sttStream.on('error', (err) => {
      this.emitError('stt_failed', err.message);
    });

    this.sttStream.on('close', () => {
      this.sttStream = null;
    });
  }

  private resetSilenceTimer(): void {
    this.clearSilenceTimer();
    this.silenceTimer = setTimeout(() => {
      // Silence timeout reached — treat current partial as final utterance
      if (this.partialTranscript && !this.isBusy) {
        void this.processUtterance(this.partialTranscript);
      }
    }, VOICE_CONFIG.stt.silenceTimeoutMs);
  }

  private clearSilenceTimer(): void {
    if (this.silenceTimer) {
      clearTimeout(this.silenceTimer);
      this.silenceTimer = null;
    }
  }

  private async processUtterance(text: string): Promise<void> {
    if (this.isBusy) return;
    this.isBusy = true;
    this.isInterrupted = false;

    this.emit('state', 'thinking' as VoiceState);
    this.partialTranscript = '';

    // Emit user message immediately so the frontend can add a user chat bubble.
    // This fires whether the turn was triggered by speechFinal OR the silence timer,
    // so it's the only reliable commit point.
    this.emit('userMessage', { text });

    // Add user turn to history
    this.conversationHistory.push({ role: 'user', content: text });

    const agent = getDefaultAgent();

    // Fresh abort controller for this turn — interrupt() will call .abort() on it
    this.abortController = new AbortController();
    const { signal } = this.abortController;

    let fullReply = '';
    let speakingStarted = false;

    try {
      for await (const sentence of agent.chatStream(
        { messages: this.conversationHistory },
        signal,
        (toolName, args, result) => {
          this.emit('toolCall', { toolName, args, result });
        },
      )) {
        if (this.isInterrupted) break;

        // Trim and skip empty sentences
        const trimmed = sentence.trim();
        if (!trimmed) continue;

        fullReply += (fullReply ? ' ' : '') + trimmed;

        // Transition to speaking on the first real sentence
        if (!speakingStarted) {
          speakingStarted = true;
          this.emit('state', 'speaking' as VoiceState);
          this.emit('reply', { text: fullReply }); // send first sentence preview
        }

        // Stream this sentence to TTS immediately — don't wait for the rest
        try {
          // Signal the frontend to reset PCM byte alignment before each new sentence stream.
          // Each ElevenLabs call is an independent PCM stream; without this signal the
          // leftover byte from the previous sentence would poison the next one.
          this.emit('ttsStart');
          for await (const chunk of this.ttsProvider.synthesize(trimmed)) {
            if (this.isInterrupted) break;
            this.emit('audioChunk', chunk);
          }
        } catch (ttsErr) {
          console.error('TTS error for sentence chunk:', ttsErr);
          // Non-fatal: skip this sentence's audio but keep going
        }

        if (this.isInterrupted) break;
      }
    } catch (err) {
      console.error('LLM stream error:', err);
      this.isBusy = false;
      this.emitError('llm_failed', err instanceof Error ? err.message : 'LLM stream failed');
      return;
    }

    // Add assistant turn to history with the full accumulated reply
    if (fullReply) {
      this.conversationHistory.push({ role: 'assistant', content: fullReply });
      // Update the frontend with the complete reply text
      this.emit('reply', { text: fullReply });
    }

    this.isBusy = false;
    this.emit('state', 'idle' as VoiceState);
  }

  private emitError(code: string, message: string): void {
    this.isBusy = false;
    this.emit('error', { code, message });
    this.emit('state', 'error' as VoiceState);
  }
}
