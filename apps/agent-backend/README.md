# agent-backend

## Purpose
The agent engine of Aegis OS. It runs a Fastify HTTP/WebSocket server that hosts LLM-backed agents, executes their tools (function calling), performs RAG over uploaded documents, bridges to MCP servers, and drives a real-time voice pipeline (STT → LLM → TTS). Everything the frontend talks to for chat, tools, knowledge, orchestration, and voice lives here.

## Boundaries
- Does **not** render UI — that is `apps/web`'s job. This service returns JSON/SSE/WebSocket frames only.
- Does **not** issue or mint auth tokens. It only *verifies* Supabase JWTs (via JWKS) and issues short-lived voice tickets; user login/signup happens in Supabase + the web app.
- Does **not** implement the MCP filesystem tools itself — those are provided by the separate `apps/mcp-filesystem` process, connected over stdio at startup.
- Persistence is limited to the Supabase `documents` vector table (RAG). There is no app database, no user store, and agent/tool registries are **in-memory only** (lost on restart).

## Public surface
HTTP entry point is `buildApp()` in `src/server.ts`; serverless wrapper is `api/index.ts`.

Routes (registered in `src/server.ts`):
- `GET /health` — liveness check (minimal in production).
- `GET /` — service banner; full route map in development only.
- `GET /agents` — list registered agents (`agent.route.ts`).
- `POST /agents/chat` — chat with the default agent (blocking JSON response).
- `POST /agents/chat/stream` — chat with the default agent over SSE (`chunk`/`tool`/`done`/`error` events).
- `POST /agents/:id/chat` — chat with a specific agent by id.
- `GET /agents/:id` — agent details (id, name, type, tool names).
- `GET /tools` / `GET /tools/:name` — list/describe registered tools (`tools.route.ts`).
- `POST /tools/:name/test` — execute a tool directly (**development only**).
- `POST /knowledge/upload` — parse → chunk → embed → store a document (`knowledge.route.ts`).
- `POST /knowledge/search` — embed a query and similarity-search the vector store.
- `GET /knowledge/list` — debug listing of stored document rows.
- `POST /api/orchestrator` — run a complex task via the orchestrator agent (`orchestrator.route.ts`).
- `GET /api/orchestrator/agents` — static list of specialized agents.
- `POST /voice/ticket` — issue a single-use WebSocket auth ticket (`voice.route.ts`).
- `GET /voice/ws?ticket=…` — voice WebSocket (binary audio in, JSON events + PCM audio out).

Core classes/functions:
- `BaseAgent` (`modules/agents/base-agent.ts`) — `chat()` runs the blocking tool-call loop; `chatStream()` yields sentences/tokens for voice/SSE.
- `createResearcherAgent` / `createPlannerAgent` / `createOrchestratorAgent` — specialized agent factories.
- Agent registry (`modules/agents/index.ts`): `getAgent`, `getDefaultAgent`, `listAgents`, `createAgent`.
- Tool registry (`modules/tools/registry.ts`): `registerTool`, `getTool`, `getAllTools`, `getToolsByNames`, `getToolsByCategory`, `executeTool`.
- `initializeMcpTools()` (`modules/tools/index.ts`) — connects to the MCP filesystem server and registers its tools.
- `VoiceSession` (`modules/voice/voice.session.ts`) — orchestrates one voice turn.
- RAG library (`shared/lib/rag/`): `parseDocument`, `RecursiveCharacterTextSplitter`, `generateEmbeddings`, `VectorStore`.

## Dependencies
Internal:
- Depends on `apps/mcp-filesystem` at runtime — resolves `../mcp-filesystem/dist/index.js` and spawns it via stdio (`modules/tools/index.ts` → `shared/lib/mcp/McpClient.ts`). **This crosses an app boundary** (backend spawns another app's build artifact); if `mcp-filesystem` is not built, MCP init logs a warning and is skipped (non-fatal).
- Consumed by `apps/web` over HTTP/SSE/WebSocket (the web app is the only intended client).

External: `fastify` (+ `@fastify/cors`, `@fastify/multipart`, `@fastify/websocket`), `openai`, `@supabase/supabase-js`, `jose`, `zod`, `cheerio`, `pdf-parse`, `@deepgram/sdk`, `elevenlabs`, `@modelcontextprotocol/sdk`, `dotenv`.

## Key flows
1. **Blocking chat (`POST /agents/chat`)**: Zod validates body (roles limited to user/assistant, ≤50 msgs, ≤10k chars each) → `getDefaultAgent()` → `BaseAgent.chat()` builds `[system, ...messages]`, picks a model via complexity estimation, calls OpenAI, and loops: if the response has `tool_calls`, each is run through `executeTool()` and results are appended as `tool` messages; the loop repeats (max 10 iterations) until the model returns plain text → response returned with `toolCalls`, `usage`, `costInfo`.
2. **Voice turn (`/voice/ws`)**: client POSTs `/voice/ticket` (JWT verified) → opens WS with the ticket → `ticketStore.consume()` validates single-use → `VoiceSession` created with Deepgram STT + ElevenLabs TTS. Audio chunks stream to STT; on `speechFinal` (or silence timeout) `processUtterance()` calls `BaseAgent.chatStream()`, emitting each sentence to TTS immediately; PCM audio streams back as binary frames. Barge-in aborts the in-flight stream via `AbortController`.
3. **RAG upload/search**: `POST /knowledge/upload` → `parseDocument` (PDF/text) → `RecursiveCharacterTextSplitter` (1000/200) → `generateEmbeddings` (`text-embedding-3-small`) → `VectorStore.addDocuments`. Query path: `search_knowledgebase` tool or `POST /knowledge/search` embeds the query and calls the Supabase `match_documents` RPC.

## Rules and constraints
- **Validate every URL a tool fetches with `validateUrl()` before the request.** Reason: prevents SSRF — it blocks localhost/private/encoded IPs and resolves DNS to defeat rebinding and the cloud metadata endpoint (`http_fetch`, `web_browse`, weather/search go through `httpGet`).
- **Never accept a `system` role from API clients.** `chatRequestSchema` allows only `user`/`assistant`. Reason: the system prompt defines agent behavior and must not be injectable.
- **Wrap and sanitize all untrusted external text before it enters an LLM prompt** using `sanitizeForLLM()` + `wrapUntrustedContent()`. Reason: defends against indirect prompt injection from scraped pages/documents (`web_browse`, `summarize`).
- **Keep filesystem tools inside `./workspace`** via `validateFilePath()`. Reason: sandboxing — blocks path traversal and sensitive files (`.env`, `.git`, credentials).
- **Cap the tool-call loop at `MAX_ITERATIONS = 10`.** Reason: prevents runaway/infinite tool loops from a misbehaving model.
- **WebSocket auth uses one-time tickets, never JWTs in the URL.** Reason: query strings leak into logs/history; tickets are single-use and expire in 30s (`ticket-store.ts`).
- **Fail fast on bad config**: `env.ts` validates all env vars with Zod at startup and `process.exit(1)` on failure.

## Gotchas
- **MCP tools are registered asynchronously after `initializeMcpTools()`**, and are prefixed `mcp_` (see `McpClient.getTools()`). They only exist if `apps/mcp-filesystem` has been built (`dist/index.js`); otherwise startup logs `⚠️ MCP Initialization skipped` and continues.
- **Cost calculation in `BaseAgent.chat()` uses `this.config.model || defaultModel`, not the dynamically-selected model**, so `costInfo` can be wrong/absent when auto model-selection picks a different model than the config's, and throws (caught) if the model isn't in `MODEL_CATALOG`. Model names in `OpenAIModel` (e.g. `gpt-4o-nano`) may not match real OpenAI model ids — `TODO: verify`.
- **In production all `console.*` are silenced** (`server.ts` overrides them when `NODE_ENV=production`), so debugging relies on Fastify's logger (which is also disabled outside development).
- **`chatStream` guards against `delta.tool_calls` being an empty-but-truthy array** — uses the accumulator length as ground truth. Changing this back to a boolean check has broken tool streaming before (see inline comments).
- **`similaritySearch` requires a Postgres `match_documents` RPC** to exist in Supabase; it is not created by this codebase. `GET /knowledge/list` reaches into `VectorStore`'s private client via `(store as any).client` — a debug-only hack.
- **`/tools/:name/test` is only registered when `NODE_ENV !== 'production'`** — it can run any registered tool with arbitrary args.

---
Source files read: `package.json`, `src/server.ts`, `api/index.ts`, `src/core/config/{env,model-config,openai}.ts`, `src/core/middleware/auth.ts`, `src/core/types/{agent,tool}.ts`, `src/modules/agents/{base-agent,index,agent.route,researcher-agent,planner-agent}.ts`, `src/modules/orchestrator/{orchestrator-agent,orchestrator.route}.ts`, `src/modules/tools/{index,registry,tools.route,calculator,time}.ts`, `src/modules/tools/{web/search,web/browse,web/summarize,http/fetch,weather/weather,filesystem/read,knowledge/search,planner/decompose,planner/validate,orchestrator/delegate,orchestrator/coordinate}.ts`, `src/modules/knowledge/knowledge.route.ts`, `src/modules/voice/{voice.route,voice.session,voice.config}.ts`, `src/shared/lib/{ticket-store,mcp/McpClient}.ts`, `src/shared/lib/rag/{chunker,embedder,parser,store}.ts`, `src/shared/utils/{sanitize,validation,http,complexity-estimator}.ts`.
