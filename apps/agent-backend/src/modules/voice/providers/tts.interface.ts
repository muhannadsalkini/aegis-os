/**
 * Provider-agnostic TTS interface.
 * Implement this to add a new TTS provider.
 */
export interface ITtsProvider {
  /**
   * Synthesize `text` and return an async iterable of audio buffers.
   * Buffers are in the format configured by the provider (e.g. MP3 chunks).
   */
  synthesize(text: string): AsyncIterable<Buffer>;
}
