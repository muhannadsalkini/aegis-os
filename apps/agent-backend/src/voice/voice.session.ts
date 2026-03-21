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
  'reply': (payload: { text: string }) => void;
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

      // Reset silence timer on every transcript event
      this.resetSilenceTimer();

      if (isFinal) {
        // A chunk was locked in! Append it forever.
        this.accumulatedUtterance += ' ' + text;
        this.accumulatedUtterance = this.accumulatedUtterance.trim();
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

    // Add user turn to history
    this.conversationHistory.push({ role: 'user', content: text });

    let replyText: string;
    try {
      const agent = getDefaultAgent();
      const response = await agent.chat({ messages: this.conversationHistory });
      replyText = response.content;
    } catch (err) {
      this.isBusy = false;
      this.emitError('llm_failed', err instanceof Error ? err.message : 'LLM call failed');
      return;
    }

    // Add assistant turn to history
    this.conversationHistory.push({ role: 'assistant', content: replyText });

    this.emit('state', 'speaking' as VoiceState);
    this.emit('reply', { text: replyText });

    try {
      for await (const chunk of this.ttsProvider.synthesize(replyText)) {
        if (this.isInterrupted) break;
        this.emit('audioChunk', chunk);
      }
    } catch (err) {
      console.log(err)
      this.isBusy = false;
      this.emitError('tts_failed', err instanceof Error ? err.message : 'TTS synthesis failed');
      return;
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
