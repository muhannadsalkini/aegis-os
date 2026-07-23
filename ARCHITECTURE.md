# Aegis OS — Architecture

Aegis OS is a pnpm-workspace monorepo for an AI agent platform: a chat + voice
console backed by an LLM agent engine with tools, RAG, multi-agent orchestration,
and MCP integration.

> Scope note: the repo contains only `apps/*` (no `packages/*` directory exists).
> Per-module details live in each app's `README.md`.

## Module map

```
apps/
  web/            Next.js frontend  ──HTTP/SSE/WS──▶  agent-backend
  agent-backend/  Fastify agent engine ──stdio──▶     mcp-filesystem
  mcp-filesystem/ Standalone MCP server (filesystem tools)

External services: OpenAI (LLM + embeddings), Supabase (auth + pgvector),
Deepgram (STT), ElevenLabs (TTS), DuckDuckGo / Open-Meteo (free tool APIs).
```

- **web** — user-facing UI. Owns rendering, mic capture, and PCM playback. Holds no agent logic.
- **agent-backend** — the brain. Hosts agents, runs the tool-call loop, RAG, orchestration, and the voice pipeline. The only writer to the Supabase `documents` table.
- **mcp-filesystem** — a generic MCP server spawned by the backend to provide `read_file`/`write_file`/`list_directory` tools over stdio.

### Layering (top → bottom)
1. **UI layer** (`apps/web`) — never calls OpenAI/Supabase-service-role directly.
2. **API/route layer** (`agent-backend/src/modules/*/**.route.ts`, `server.ts`) — HTTP/WS surface, auth, request validation.
3. **Domain layer** (`modules/agents`, `modules/orchestrator`, `modules/voice`) — agents, tool-call loop, voice sessions.
4. **Tool layer** (`modules/tools/**`) — individual capabilities the LLM can invoke.
5. **Shared libs/utils** (`shared/lib`, `shared/utils`) — RAG, MCP client, HTTP, validation, sanitization. Pure-ish helpers, no route knowledge.
6. **Core/config** (`core/config`, `core/types`, `core/middleware`) — env, model catalog, OpenAI client, types, auth.

Allowed direction is downward only: routes → domain → tools → shared → core.
The one boundary-crossing edge is **agent-backend → mcp-filesystem's built artifact**
(`../mcp-filesystem/dist/index.js`), flagged in both modules' READMEs.

## Request & job lifecycles

**Text chat (blocking)** — `POST /agents/chat`:
`server.ts` (CORS, optional auth) → Zod-validated body → `getDefaultAgent()` →
`BaseAgent.chat()` runs a bounded loop (≤10 iterations): OpenAI call → if
`tool_calls`, execute each via `executeTool()`, append `tool` results, repeat;
else return `{ content, toolCalls, usage, costInfo }`.

**Text chat (streaming)** — `POST /agents/chat/stream`: same core, but
`BaseAgent.chatStream()` yields tokens/sentences pushed to the client as SSE
`data:` events (`chunk` / `tool` / `done` / `error`). Consumed by
`useChatStream` in the web app.

**Voice turn (job over WebSocket)** — `POST /voice/ticket` (JWT verified, issues a
30s single-use ticket) → `GET /voice/ws?ticket=…` → `ticketStore.consume()` →
`VoiceSession` wires Deepgram STT + ElevenLabs TTS. Mic audio → STT; on
`speechFinal`/silence → `processUtterance()` → `chatStream()` → each sentence
streamed to TTS immediately → PCM audio returned as binary WS frames. Barge-in
aborts the in-flight LLM/tool stream via `AbortController`.

**RAG ingest (job)** — `POST /knowledge/upload`: `parseDocument` (PDF/text) →
`RecursiveCharacterTextSplitter` (1000/200) → `generateEmbeddings`
(`text-embedding-3-small`) → `VectorStore.addDocuments` (Supabase). Retrieval via
the `search_knowledgebase` tool or `POST /knowledge/search`, both calling the
Supabase `match_documents` RPC.

**Multi-agent** — the orchestrator agent uses `delegate_to_agent` (sequential,
loop-guarded) and `coordinate_agents` (parallel with timeout) to hand tasks to
the researcher/planner agents, which run their own `BaseAgent` loops.

## Data flow

- **Auth**: browser holds a Supabase session (cookies via `@supabase/ssr`); web
  middleware refreshes it and gates routes. The JWT is sent as
  `Authorization: Bearer` to the backend, which verifies it against Supabase JWKS
  using `jose`. Voice trades the JWT for a ticket to avoid JWTs in URLs.
- **Vectors**: only the backend (service-role key) reads/writes the `documents`
  table; embeddings never touch the browser.
- **Untrusted text**: web-scraped/document content is sanitized
  (`sanitizeForLLM`) and wrapped (`wrapUntrustedContent`) before entering any LLM
  prompt.
- **State**: no durable app state beyond `documents`. Agent/tool registries and
  voice sessions are in-memory and reset on backend restart; chat history is
  in-memory in the browser.

## Cross-cutting rules (apply everywhere)

- **Tenancy/auth**: user identity comes only from a verified Supabase JWT
  (backend) or the SSR session (web). Never trust a client-supplied user id.
  Reason: the backend has no user store — the JWT is the source of truth.
  `TODO: verify` whether the `documents` table / `match_documents` are
  per-user/org-scoped; current code does not appear to filter by user.
- **No `system` role from clients**: request schemas allow only `user`/`assistant`.
  Reason: the system prompt defines agent behavior and must not be injectable.
- **SSRF-safe fetching**: any outbound URL a tool hits must pass `validateUrl()`
  (protocol allowlist + private/encoded-IP blocks + DNS resolution). Reason:
  block access to localhost, private networks, and cloud metadata.
- **Prompt-injection defense**: sanitize + trust-boundary-wrap all external text
  before LLM ingestion. Reason: scraped pages/documents may contain hidden
  instructions.
- **Filesystem sandboxing**: backend tools stay within `./workspace`
  (`validateFilePath`); the MCP server validates against its root. Reason: prevent
  traversal and access to secrets.
- **Bounded loops**: agent tool-call loops cap at `MAX_ITERATIONS = 10`;
  delegation is loop-guarded; coordination is timeout-bounded. Reason: prevent
  runaway execution and cost blowups.
- **Fail-fast config**: `env.ts` validates all env vars with Zod and exits on
  failure. Reason: surface misconfiguration at boot, not mid-request.
- **Error handling**: routes return `{ success, error }` JSON and log server-side;
  tools return `{ success, error }` instead of throwing; the voice/MCP layers
  degrade gracefully (emit an error event / `isError` content) rather than
  crashing the process.
- **Layering discipline**: dependencies flow downward (routes → domain → tools →
  shared → core). The only sanctioned cross-app edge is backend → mcp-filesystem
  over stdio.

## Known sharp edges (system-wide)

- Cost/model reporting can mismatch the dynamically-selected model, and some
  model ids in the catalog may not be real OpenAI ids (`TODO: verify`).
- `console.*` is stripped in the web build and silenced in backend production —
  don't rely on console logs in prod.
- MCP tools only exist if `mcp-filesystem` is built; otherwise they're silently
  skipped.
- The web `app/page.tsx` imports voice code from paths (`../hooks`,
  `../components/voice`) that differ from the `features/voice` tree — confirm the
  authoritative copies before editing (`TODO: verify`).

---
Source files read: root `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, and the three per-app source trees documented in `apps/*/README.md` (agents, tools, orchestrator, voice, RAG, MCP client, shared utils, web auth/chat/voice hooks, and the MCP filesystem server).
