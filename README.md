# 🛡️ Aegis OS

**A multi-agent AI platform with tool calling, RAG, MCP integration, and real-time voice — built as a TypeScript monorepo.**

🌐 **Live:** [aegisos.info](https://aegisos.info/)

Aegis OS is a chat and voice console backed by a custom agent engine. Agents run an OpenAI function-calling loop over a registry of tools, retrieve from a Supabase/pgvector knowledge base, delegate work to specialized sub-agents, and stream every token, tool call, and tool result back to the browser as it happens.

---

## ✨ Features

- **Agent engine** — `BaseAgent` runs a bounded tool-call loop (max 10 iterations) with blocking and streaming modes; streamed over SSE (`chunk` / `tool` / `done` / `error` events).
- **Multi-agent orchestration** — a default conversational agent plus Researcher, Planner, and Orchestrator agents. The orchestrator hands off work sequentially (`delegate_to_agent`, loop-guarded) or in parallel (`coordinate_agents`, timeout-bounded).
- **15 built-in tools** — calculator, time, web search (DuckDuckGo), web browse/scrape, summarize, HTTP fetch, weather (Open-Meteo), sandboxed file read/write/list, knowledge-base search, task decomposition, goal validation, and agent delegation/coordination.
- **RAG knowledge base** — upload PDF, TXT, Markdown, or JSON; documents are parsed, chunked (1000/200 recursive splitter), embedded with `text-embedding-3-small`, and stored in Supabase pgvector. Retrieval is available as an agent tool and as an API.
- **MCP integration** — the backend spawns a standalone MCP filesystem server over stdio and registers its tools automatically (prefixed `mcp_`).
- **Real-time voice** — WebSocket pipeline with Deepgram STT (`nova-2`) and ElevenLabs TTS (`eleven_turbo_v2_5`). Replies are synthesized sentence by sentence while the agent is still generating, and the user can barge in to interrupt mid-reply.
- **Cost-aware model selection** — a complexity estimator routes each request to an appropriately sized model and reports token usage and estimated cost.
- **Security hardening** — Supabase JWT auth verified against JWKS, single-use 30s tickets for WebSocket auth (no JWTs in URLs), SSRF-safe URL validation with DNS resolution, prompt-injection sanitization and trust-boundary wrapping of scraped content, filesystem sandboxing, CORS allowlist, Zod validation on every request and on env config.

---

## 🏗️ Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  apps/web — Next.js 15 (App Router)                          │
│  Chat console • Voice mode • Knowledge upload • Auth         │
└──────────────┬──────────────────────────────┬────────────────┘
               │ HTTPS + SSE (chat, RAG)      │ WebSocket (voice)
               ▼                              ▼
┌──────────────────────────────────────────────────────────────┐
│  apps/agent-backend — Fastify + OpenAI SDK                   │
├──────────────────────────────────────────────────────────────┤
│  Routes: /agents  /tools  /knowledge  /api/orchestrator      │
│          /voice/ticket  /voice/ws        (JWT preHandler)    │
├──────────────────────────────────────────────────────────────┤
│  Agents: Aegis • Researcher • Planner • Orchestrator         │
│          BaseAgent tool-call loop + model selection          │
├──────────────────────────────────────────────────────────────┤
│  Tool registry: web • http • weather • filesystem • planner  │
│                 knowledge search • delegation • MCP tools    │
├──────────────────────────────────────────────────────────────┤
│  Voice session: Deepgram STT → agent stream → ElevenLabs TTS │
├──────────────────────────────────────────────────────────────┤
│  Shared: RAG (parse/chunk/embed/store) • MCP client •        │
│          SSRF validation • sanitization                      │
└──────┬───────────────────────┬────────────────────┬──────────┘
       │ stdio                 │                    │
       ▼                       ▼                    ▼
 apps/mcp-filesystem    Supabase (Auth +      OpenAI, Deepgram,
 (MCP server)           pgvector documents)   ElevenLabs
```

Dependencies flow strictly downward: routes → agents → tools → shared → core. See [ARCHITECTURE.md](ARCHITECTURE.md) for request lifecycles, data flow, and cross-cutting rules, and each app's `README.md` for module-level detail.

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, Tailwind CSS, lucide-react, react-markdown |
| **Backend** | Node.js 20, Fastify 4, TypeScript, Zod |
| **AI** | OpenAI SDK (function calling, streaming, embeddings) |
| **Data & Auth** | Supabase (Postgres + pgvector, Auth), `jose` for JWT verification |
| **Protocol** | Model Context Protocol (`@modelcontextprotocol/sdk`) |
| **Voice** | Deepgram (STT), ElevenLabs (TTS), Web Audio API |
| **Transport** | REST, Server-Sent Events, WebSocket |
| **Tooling** | pnpm workspaces, tsx, nodemon |

---

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ and pnpm 9
- An OpenAI API key
- A Supabase project with pgvector enabled — run the SQL in [docs/phase-3-rag/SETUP.md](docs/phase-3-rag/SETUP.md) to create the `documents` table and `match_documents` function
- Optional: Deepgram and ElevenLabs API keys for voice mode

### 1. Install

```bash
git clone https://github.com/muhannadsalkini/aegis-os.git
cd aegis-os
pnpm install
```

### 2. Configure the backend

```bash
cp apps/agent-backend/env.example.txt apps/agent-backend/.env
```

| Variable | Required | Description |
|----------|----------|-------------|
| `OPENAI_API_KEY` | ✅ | OpenAI API key |
| `SUPABASE_URL` | ✅ | Supabase project URL (also used for JWKS verification) |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Service-role key for the vector store |
| `OPENAI_MODEL` | | Default model (`gpt-4o-mini`) |
| `PORT` | | Backend port (`3001`) |
| `WEB_APP_URL` | | Allowed CORS origin (`http://localhost:3000`) |
| `DEEPGRAM_API_KEY` | | Required for voice |
| `ELEVENLABS_API_KEY` | | Required for voice |

### 3. Configure the web app

Create `apps/web/.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. (Optional) Build the MCP server

```bash
pnpm --filter mcp-filesystem build
```

If it isn't built, the backend skips MCP tools with a warning and keeps running.

### 5. Run

```bash
pnpm dev        # agent backend on http://localhost:3001
pnpm dev:web    # web app on http://localhost:3000
```

Sign in through Supabase Auth at `http://localhost:3000/login`. All backend routes except `/` and `/health` require a Supabase access token (`Authorization: Bearer <token>`).

### Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Start the agent backend (nodemon + tsx) |
| `pnpm dev:web` | Start the Next.js app (Turbopack) |
| `pnpm dev:all` | Start every workspace package in dev mode |
| `pnpm build` | Build all packages |
| `pnpm lint` | Lint all packages |

---

## 📁 Project Structure

```
aegis-os/
├── apps/
│   ├── web/                     # Next.js frontend
│   │   └── src/
│   │       ├── app/             # Routes: / (chat + voice), /login, /knowledge, /auth/callback
│   │       ├── features/        # chat/ and voice/ components + hooks (SSE, WebSocket, PCM playback)
│   │       ├── components/      # Layout and AuthProvider
│   │       └── lib/supabase/    # Browser/server/middleware Supabase clients
│   ├── agent-backend/           # Fastify agent engine
│   │   ├── api/index.ts         # Serverless entry (Vercel)
│   │   └── src/
│   │       ├── server.ts        # App bootstrap, CORS, auth hook, route registration
│   │       ├── core/            # Env validation, model catalog, OpenAI client, auth middleware, types
│   │       ├── modules/
│   │       │   ├── agents/      # BaseAgent, agent registry, researcher & planner agents
│   │       │   ├── orchestrator/# Orchestrator agent and route
│   │       │   ├── tools/       # Tool registry and all tool implementations
│   │       │   ├── knowledge/   # RAG upload/search routes
│   │       │   └── voice/       # Voice session, ticket route, Deepgram/ElevenLabs providers
│   │       └── shared/          # RAG pipeline, MCP client, ticket store, validation, sanitization
│   └── mcp-filesystem/          # Standalone MCP server (stdio) for filesystem tools
├── docs/
│   ├── phase-1-foundations/ … phase-5-mcp/   # Design notes per build phase
│   └── planning/                # Original idea, roadmap, and diagrams
├── ARCHITECTURE.md
└── pnpm-workspace.yaml
```

---

## 🗺️ Roadmap

- Agent management dashboard (create and configure agents from the UI)
- Per-user knowledge-base scoping
- Persistent chat history
- Image generation tool

---

## 📄 License

[MIT](LICENSE) © 2026 Muhannad Salkini
