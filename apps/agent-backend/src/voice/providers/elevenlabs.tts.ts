import type { ITtsProvider } from './tts.interface.js';
import { VOICE_CONFIG } from '../voice.config.js';
import { ElevenLabsClient } from 'elevenlabs';

export class ElevenLabsTtsProvider implements ITtsProvider {
  private client: ElevenLabsClient;

  constructor(apiKey: string) {
    this.client = new ElevenLabsClient({ apiKey });
  }

  async *synthesize(text: string): AsyncIterable<Buffer> {
    const { voiceId, modelId, outputFormat } = VOICE_CONFIG.tts;

    const audioStream = await this.client.textToSpeech.convert(voiceId, {
      text,
      model_id: modelId,
      output_format: outputFormat,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
      },
    });

    for await (const chunk of audioStream) {
      yield Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    }
  }
}
