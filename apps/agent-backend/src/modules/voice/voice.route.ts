import type { FastifyInstance } from 'fastify';
import { env } from '../../core/config/env.js';
import { VoiceSession } from '../../modules/voice/voice.session.js';
import { DeepgramSttProvider } from '../../modules/voice/providers/deepgram.stt.js';
import { ElevenLabsTtsProvider } from '../../modules/voice/providers/elevenlabs.tts.js';

/**
 * Voice WebSocket Route
 *
 * Endpoint: GET /voice/ws  (WebSocket upgrade)
 *
 * Binary frames → raw audio chunks from the browser
 * JSON frames   → control messages { type: "stop" }
 *
 * Server → Client JSON frames:
 *   { type: "transcript", text, isFinal }
 *   { type: "state", state: "idle"|"listening"|"thinking"|"speaking"|"error" }
 *   { type: "error", code, message }
 *   <binary frames> → TTS audio (MP3 chunks)
 */
export async function voiceRoutes(fastify: FastifyInstance) {
  // Validate API keys are present
  if (!env.DEEPGRAM_API_KEY || !env.ELEVENLABS_API_KEY) {
    fastify.log.warn(
      '⚠️  DEEPGRAM_API_KEY or ELEVENLABS_API_KEY not set — /voice/ws will reject connections'
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fastify as any).get(
    '/voice/ws',
    { websocket: true },
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (connection: any, _request: any) => {
      const socket = connection.socket; // Get the raw ws WebSocket instance

      // Guard: keys not configured
      if (!env.DEEPGRAM_API_KEY || !env.ELEVENLABS_API_KEY) {
        socket.send(
          JSON.stringify({
            type: 'error',
            code: 'config_missing',
            message: 'Voice API keys are not configured on the server.',
          })
        );
        socket.close();
        return;
      }

      fastify.log.info('🎙️ Voice WebSocket connection opened');

      const sttProvider = new DeepgramSttProvider(env.DEEPGRAM_API_KEY);
      const ttsProvider = new ElevenLabsTtsProvider(env.ELEVENLABS_API_KEY);
      const session = new VoiceSession(sttProvider, ttsProvider);

      // ── Session → Client ──────────────────────────────────────────────────

      session.on('state', (state) => {
        if (socket.readyState !== 1 /* OPEN */) return;
        socket.send(JSON.stringify({ type: 'state', state }));
      });

      session.on('transcript', ({ text, isFinal }) => {
        if (socket.readyState !== 1) return;
        socket.send(JSON.stringify({ type: 'transcript', text, isFinal }));
      });

      session.on('userMessage', ({ text }) => {
        if (socket.readyState !== 1) return;
        // Sent once when processUtterance fires — reliable regardless of trigger (speechFinal or silence timer)
        socket.send(JSON.stringify({ type: 'user_message', text }));
      });

      session.on('reply', ({ text }) => {
        if (socket.readyState !== 1) return;
        socket.send(JSON.stringify({ type: 'reply', text }));
      });

      session.on('ttsStart', () => {
        if (socket.readyState !== 1) return;
        // Sentinel JSON frame: tells the client to reset PCM byte-alignment state
        // before the binary audio frames for the next sentence arrive.
        socket.send(JSON.stringify({ type: 'tts_start' }));
      });

      session.on('toolCall', ({ toolName, args, result }) => {
        if (socket.readyState !== 1) return;
        socket.send(JSON.stringify({ type: 'tool_call', toolName, args, result }));
      });

      session.on('audioChunk', (chunk: Buffer) => {
        if (socket.readyState !== 1) return;
        socket.send(chunk); // send binary frame
      });

      session.on('error', ({ code, message }) => {
        if (socket.readyState !== 1) return;
        socket.send(JSON.stringify({ type: 'error', code, message }));
      });

      // ── Client → Session ──────────────────────────────────────────────────

      socket.on('message', async (raw: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
        // Handle WS library data formats (ws usually provides Buffer)
        let dataBuf: Buffer;
        if (Buffer.isBuffer(raw)) {
          dataBuf = raw;
        } else if (raw instanceof ArrayBuffer) {
          dataBuf = Buffer.from(raw);
        } else if (Array.isArray(raw)) {
          dataBuf = Buffer.concat(raw);
        } else {
          dataBuf = Buffer.from(raw);
        }

        // Binary frame → audio chunk
        if (isBinary) {
          await session.handleAudioChunk(dataBuf);
          return;
        }

        // JSON control frame
        try {
          const msg = JSON.parse(raw.toString());
          if (msg.type === 'stop') {
            await session.close();
          }
        } catch {
          // ignore malformed JSON
        }
      });

      // ── Cleanup ───────────────────────────────────────────────────────────

      socket.on('close', async () => {
        fastify.log.info('🎙️ Voice WebSocket connection closed');
        await session.close();
      });

      socket.on('error', (err: Error) => {
        fastify.log.error(`🎙️ Voice WebSocket error: ${err.message}`);
      });
    }
  );
}
