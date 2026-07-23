import { EventEmitter } from 'node:events';
import { DeepgramClient } from '@deepgram/sdk';
import type { ISttProvider, SttStream } from './stt.interface.js';
import { VOICE_CONFIG } from '../voice.config.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type V1Socket = Awaited<ReturnType<InstanceType<typeof DeepgramClient>['listen']['v1']['connect']>>;

class DeepgramSttStream extends EventEmitter implements SttStream {
  private socket: V1Socket;

  constructor(socket: V1Socket) {
    super();
    this.socket = socket;

    // Forward transcript events
    this.socket.on('message', (msg) => {
      // ListenV1Results has `channel` with alternatives
      if (!('channel' in msg)) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = msg as any;
      const alt = result.channel?.alternatives?.[0];
      if (!alt || !alt.transcript) return;

      this.emit('transcript', {
        text: alt.transcript as string,
        isFinal: Boolean(result.is_final),
        speechFinal: Boolean(result.speech_final),
      });
    });

    this.socket.on('error', (err) => {
      console.error('Deepgram STT Socket Error:', err);
      this.emit('error', err);
    });

    this.socket.on('close', () => {
      this.emit('close');
    });
  }

  sendAudio(chunk: Buffer): void {
    if (this.socket.readyState === 1 /* OPEN */) {
      this.socket.sendMedia(chunk);
    } else {
      console.warn('Deepgram websocket not open, dropping audio chunk');
    }
  }

  finish(): void {
    if (this.socket.readyState === 1 /* OPEN */) {
      this.socket.sendCloseStream({ type: 'CloseStream' });
    }
  }
}

export class DeepgramSttProvider implements ISttProvider {
  private client: InstanceType<typeof DeepgramClient>;
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.client = new DeepgramClient({ apiKey });
  }

  async createStream(): Promise<SttStream> {
    // Deepgram connection parameters. `nova-2` (en-US) is the model this
    // provider is built and tested against, so we pin it here directly.
    const socket = await this.client.listen.v1.connect({
      Authorization: `Token ${this.apiKey}`,
      model: 'nova-2',
      language: 'en-US',
      // Emit interim results so partial transcripts flow to the UI
      interim_results: 'true',
      // end-of-speech detection (ms)
      endpointing: VOICE_CONFIG.stt.silenceTimeoutMs,

      // @ts-expect-error typing mismatch
      keepalive: 'true',
    });

    console.log('Deepgram socket created, waiting for open state...');
    socket.connect();
    await socket.waitForOpen();
    console.log('Deepgram socket OPEN');

    socket.on('error', (err: any) => console.error('Deepgram global socket error:', err));
    socket.on('close', () => console.log('Deepgram global socket closed'));

    return new DeepgramSttStream(socket);
  }
}
