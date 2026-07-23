# web

## Purpose
The Next.js (App Router) frontend for Aegis OS — the user-facing chat + voice console. It authenticates users with Supabase, streams text chat from the agent backend over SSE, runs a real-time voice session over WebSocket, and provides a knowledge-base upload page. It is a thin client: all agent intelligence lives in `apps/agent-backend`.

## Boundaries
- Does **not** run agents, call OpenAI, or execute tools — it only sends messages to the backend and renders results.
- Does **not** own auth logic beyond Supabase SSR session handling; token *verification* happens in the backend.
- Does **not** persist chat history — conversation state is in-memory React state (lost on refresh).
- Voice audio capture/playback happens here (Web Audio API), but STT/TTS/LLM processing happen in the backend.

## Public surface
Routes (App Router, `src/app/`):
- `/` (`app/page.tsx`) — main chat + voice console. **Note:** this file imports from `../hooks/useVoiceAgent` and `../components/voice/*`, paths that don't match the `src/features/voice/*` and `src/hooks/` layout — `TODO: verify` which copies are the live ones.
- `/login` (`app/login/page.tsx`) — Supabase auth screen.
- `/knowledge` (`app/knowledge/page.tsx`) — document upload UI (posts to backend `/knowledge/upload`).
- `/auth/callback` (`app/auth/callback/route.ts`) — exchanges the Supabase auth code for a session, then redirects.

Key modules:
- `middleware.ts` + `lib/supabase/middleware.ts` — `updateSession()` refreshes the Supabase session on every request and redirects unauthenticated users to `/login`.
- `lib/supabase/{client,server}.ts` — `createClient()` factories for browser and server contexts (`@supabase/ssr`).
- `components/providers/AuthProvider.tsx` — `AuthProvider` + `useAuth()` hook exposing `user`, `session`, `signOut`, `getAccessToken`.
- `features/chat/hooks/useChatStream.ts` — `useChatStream(apiUrl, getAccessToken)`: SSE client for `/agents/chat/stream`; exposes `messages`, `toolCalls`, `sendMessage`, `clearChat`, `error`.
- `features/voice/hooks/useVoiceAgent.ts` — `useVoiceAgent(...)`: full voice pipeline (mic capture, ticket exchange, WebSocket, PCM playback scheduling); exposes `voiceState`, `startListening`, `stopSession`, `getByteFrequencyData`.
- `features/chat/components/*`, `features/voice/components/*` — presentational chat/voice UI.

## Dependencies
Internal: consumes `apps/agent-backend` exclusively over HTTP (`/agents/chat`, `/agents/chat/stream`, `/knowledge/*`) and WebSocket (`/voice/ticket`, `/voice/ws`). Base URL from `NEXT_PUBLIC_API_URL` (default `http://localhost:3001`). No other Aegis package imports this app.

External: `next`, `react`, `@supabase/ssr`, `@supabase/supabase-js`, `tailwindcss`, `zustand` (store dir present). Talks to Supabase directly for auth only.

## Key flows
1. **Auth gate**: every request passes through `middleware.ts` → `updateSession()`. It refreshes cookies, calls `supabase.auth.getUser()`, and redirects `!user` → `/login` (except public routes `/login`, `/auth/callback`); an authenticated user hitting `/login` is bounced to `/`.
2. **Streaming chat**: `useChatStream.sendMessage()` optimistically appends the user message + an empty assistant bubble → `POST /agents/chat/stream` with `Authorization: Bearer <token>` → reads the SSE body, splitting on `\n\n`, parsing `data:` lines → `chunk` events append tokens to the last assistant bubble, `tool` events push tool cards, `error` sets the error state.
3. **Voice session**: `useVoiceAgent.startListening()` requests mic access → sets up an `AudioContext`/analyser → `POST /voice/ticket` to trade the JWT for a single-use ticket → opens `wss://…/voice/ws?ticket=…` → streams webm/opus chunks every 250ms; incoming binary frames are queued as 24kHz PCM and hardware-scheduled for gapless playback, while JSON `state`/`reply`/`user_message`/`tool_call` events drive the UI. A backend `listening` state mid-playback triggers barge-in (playback is torn down).

## Rules and constraints
- **Always attach the Supabase access token via `getAccessToken()` on backend calls.** Reason: the backend rejects unauthenticated requests; the token comes from the cached session (`AuthProvider`) with a fresh-fetch fallback.
- **Never put the JWT in a WebSocket URL** — exchange it for a ticket first (`/voice/ticket`). Reason: URLs leak into logs/history; matches the backend's ticket contract.
- **Keep `NEXT_PUBLIC_*` env vars limited to non-secret, client-safe values** (Supabase URL, anon key, API URL). Reason: anything `NEXT_PUBLIC_` is shipped to the browser.
- **Route protection lives in middleware, not pages.** Reason: centralizes the auth redirect and session refresh so individual pages don't re-implement it.
- **Clean up all audio resources on stop/unmount** (`cleanup()` in `useVoiceAgent`). Reason: mic tracks, `AudioContext`, WebSocket, and playback timers otherwise leak and keep the mic hot.

## Gotchas
- **`next.config.ts` strips ALL `console.*` in builds** (`removeConsole.exclude: []`), including `console.error`. Production debugging must not rely on console output.
- **PCM playback holds back an odd trailing byte** (`pcmLeftoverRef`) between chunks; `tts_start` resets it. Removing this alignment logic causes audible clicks/misaligned samples.
- **Backend `idle` is mapped to UI `listening`** — the hook deliberately shows "listening" when the server reports "idle" so users see voice mode is still active.
- **`middleware.ts` (and its Supabase helper) contain verbose `console.log` auth tracing** that will be stripped in production but is noisy in dev.
- **Two apparently parallel component/hook trees exist** (`src/hooks` + `src/components/voice` referenced by `page.tsx`, vs `src/features/voice`). Confirm which is authoritative before editing — `TODO: verify`.

---
Source files read: `package.json`, `next.config.ts`, `src/middleware.ts`, `src/lib/supabase/{client,server,middleware}.ts`, `src/app/{layout,page}.tsx`, `src/app/auth/callback/route.ts`, `src/components/providers/AuthProvider.tsx`, `src/features/chat/{types.ts,hooks/useChatStream.ts}`, `src/features/voice/hooks/useVoiceAgent.ts`; plus the file tree from environment listing.
