import { EventEmitter } from 'node:events';

/**
 * Events emitted by an STT stream:
 *   'transcript'  — { text: string; isFinal: boolean }
 *   'error'       — Error
 *   'close'       — (no payload) stream ended cleanly
 */
export interface SttStream extends EventEmitter {
  /** Push a raw audio chunk (WebM/Opus or PCM) into the STT stream */
  sendAudio(chunk: Buffer): void;
  /** Signal that no more audio will be sent; provider should flush */
  finish(): void;
}

/**
 * Provider-agnostic STT interface.
 * Implement this to add a new STT provider.
 */
export interface ISttProvider {
  /** Open a new streaming transcription session */
  createStream(): Promise<SttStream>;
}
