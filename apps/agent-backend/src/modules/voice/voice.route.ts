import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { WebSocket } from 'ws';
import { env } from '../../core/config/env.js';
import { requireAuth } from '../../core/middleware/auth.js';
import { ticketStore } from '../../shared/lib/ticket-store.js';
import { VoiceSession } from '../../modules/voice/voice.session.js';
import { DeepgramSttProvider } from '../../modules/voice/providers/deepgram.stt.js';
import { ElevenLabsTtsProvider } from '../../modules/voice/providers/elevenlabs.tts.js';

/**
 * ==========================================
 * Voice Routes
 * ==========================================
 *
 * POST /voice/ticket
 *   — Authenticated REST endpoint. Validates the Bearer JWT and returns a
 *     short-lived (30s), single-use ticket UUID. The client uses this ticket
 *     to authenticate the WebSocket upgrade without putting a JWT in the URL.
 *
 * GET /voice/ws?ticket=<uuid>  (WebSocket upgrade)
 *   — Validates the one-time ticket (no JWT in query string).
 *   — Binary frames → raw audio chunks from the browser microphone.
 *   — JSON frames  → control messages e.g. { type: "stop" }
 *
 * Server → Client JSON frames:
 *   { type: "transcript", text, isFinal }
 *   { type: "state",      state: "idle" | "listening" | "thinking" | "speaking" | "error" }
 *   { type: "error",      code, message }
 *   <binary frames> → TTS audio (PCM chunks)
 */

/** WebSocket close codes (4000–4999 are application-defined per RFC 6455). */
const WS_CLOSE = {
  UNAUTHORIZED: 4401,
  TIMEOUT:      4408,
  CONFIG_ERROR: 4500,
} as const;

/** How long the server waits for the WebSocket connection to be accepted once opened. */
const AUTH_TIMEOUT_MS = 5_000;

export async function voiceRoutes(fastify: FastifyInstance) {
  // ── Guard: warn if voice providers are not configured ─────────────────────

  if (!env.DEEPGRAM_API_KEY || !env.ELEVENLABS_API_KEY) {
    fastify.log.warn(
      '⚠️  DEEPGRAM_API_KEY or ELEVENLABS_API_KEY not set — /voice/ws will reject all connections',
    );
  }

  // ── POST /voice/ticket ────────────────────────────────────────────────────
  //
  // Protected by requireAuth. Client must send:
  //   Authorization: Bearer <supabase-access-token>
  //
  // Returns: { ticket: "<uuid>" }  (expires in 30 seconds)

  fastify.post(
    '/voice/ticket',
    { preHandler: requireAuth },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const user = request.user!; // guaranteed by requireAuth

      const ticket = ticketStore.create(user.sub, user.email);

      fastify.log.info({ userId: user.sub }, '🎟️  Voice ticket issued');

      return reply.status(201).send({ ticket });
    },
  );

  // ── GET /voice/ws  (WebSocket upgrade) ────────────────────────────────────
  //
  // Client must connect with ?ticket=<uuid> obtained from POST /voice/ticket.
  // The ticket is single-use and expires after 30 seconds.

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (fastify as any).get(
    '/voice/ws',
    { websocket: true },
    // The `connection` object comes from @fastify/websocket.
    // We type `socket` explicitly via the `ws` package types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    async (connection: any, request: FastifyRequest) => {
      const socket: WebSocket = connection.socket;

      // ── Step 1: Extract ticket from query string ───────────────────────

      const url    = new URL(request.url, 'http://localhost');
      const ticket = url.searchParams.get('ticket');

      if (!ticket) {
        fastify.log.warn('🎙️ WS rejected — no ticket provided');
        socket.close(WS_CLOSE.UNAUTHORIZED, 'Missing authentication ticket');
        return;
      }

      // ── Step 2: Enforce an auth deadline ──────────────────────────────
      //
      // Even though ticket validation is synchronous, the deadline protects
      // against an attacker who opens the WS without providing a ticket and
      // holds the connection open indefinitely (connection exhaustion attack).

      const authDeadline = setTimeout(() => {
        if (socket.readyState === socket.OPEN) {
          fastify.log.warn('🎙️ WS auth timeout — closing connection');
          socket.close(WS_CLOSE.TIMEOUT, 'Authentication timeout');
        }
      }, AUTH_TIMEOUT_MS);

      // ── Step 3: Consume (validate + immediately invalidate) the ticket ─

      const ticketData = ticketStore.consume(ticket);
      clearTimeout(authDeadline); // ticket resolved — deadline no longer needed

      if (!ticketData) {
        fastify.log.warn({ ticket }, '🎙️ WS rejected — invalid, expired, or already-used ticket');
        socket.close(WS_CLOSE.UNAUTHORIZED, 'Invalid or expired authentication ticket');
        return;
      }

      fastify.log.info({ userId: ticketData.userId }, '🎙️ Voice WebSocket connection opened');

      // ── Step 4: Guard — voice API keys must be configured ─────────────

      if (!env.DEEPGRAM_API_KEY || !env.ELEVENLABS_API_KEY) {
        socket.send(
          JSON.stringify({
            type:    'error',
            code:    'config_missing',
            message: 'Voice API keys are not configured on the server.',
          }),
        );
        socket.close(WS_CLOSE.CONFIG_ERROR, 'Voice providers not configured');
        return;
      }

      // ── Step 5: Bootstrap the voice session ───────────────────────────

      const sttProvider = new DeepgramSttProvider(env.DEEPGRAM_API_KEY);
      const ttsProvider = new ElevenLabsTtsProvider(env.ELEVENLABS_API_KEY);
      const session     = new VoiceSession(sttProvider, ttsProvider);

      /** Helper: send a JSON frame only if the socket is still open. */
      const sendJson = (payload: Record<string, unknown>): void => {
        if (socket.readyState === socket.OPEN) {
          socket.send(JSON.stringify(payload));
        }
      };

      // ── Session → Client events ────────────────────────────────────────

      session.on('state', (state) => {
        sendJson({ type: 'state', state });
      });

      session.on('transcript', ({ text, isFinal }) => {
        sendJson({ type: 'transcript', text, isFinal });
      });

      session.on('userMessage', ({ text }) => {
        sendJson({ type: 'user_message', text });
      });

      session.on('reply', ({ text }) => {
        sendJson({ type: 'reply', text });
      });

      session.on('ttsStart', () => {
        sendJson({ type: 'tts_start' });
      });

      session.on('toolCall', ({ toolName, args, result }) => {
        sendJson({ type: 'tool_call', toolName, args, result });
      });

      session.on('audioChunk', (chunk: Buffer) => {
        if (socket.readyState === socket.OPEN) {
          socket.send(chunk); // binary frame
        }
      });

      session.on('error', ({ code, message }) => {
        sendJson({ type: 'error', code, message });
      });

      // ── Client → Session events ────────────────────────────────────────

      socket.on('message', async (raw: Buffer | ArrayBuffer | Buffer[], isBinary: boolean) => {
        // Normalise the various ws data types into a single Buffer
        let dataBuf: Buffer;
        if (Buffer.isBuffer(raw)) {
          dataBuf = raw;
        } else if (raw instanceof ArrayBuffer) {
          dataBuf = Buffer.from(raw);
        } else if (Array.isArray(raw)) {
          dataBuf = Buffer.concat(raw);
        } else {
          dataBuf = Buffer.from(raw as ArrayBuffer);
        }

        if (isBinary) {
          await session.handleAudioChunk(dataBuf);
          return;
        }

        // JSON control frame
        try {
          const msg = JSON.parse(dataBuf.toString()) as { type: string };
          if (msg.type === 'stop') {
            await session.close();
          }
        } catch {
          // Ignore malformed JSON — don't crash the session
        }
      });

      // ── Cleanup ────────────────────────────────────────────────────────

      socket.on('close', async () => {
        fastify.log.info({ userId: ticketData.userId }, '🎙️ Voice WebSocket connection closed');
        await session.close();
      });

      socket.on('error', (err: Error) => {
        fastify.log.error({ userId: ticketData.userId, err: err.message }, '🎙️ Voice WebSocket error');
      });
    },
  );
}
