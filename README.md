# 🛡️ Aegis OS - Your AI Agent Operating System

> Your own AI agents with tools, RAG knowledgebases, MCP support, and real-time streaming.

## 🎯 What is Aegis OS?

Think of it as your personal Copilot Studio, but cooler.

By the end of this project, you'll understand:
- ✅ **Agents** — How LLMs become autonomous workers
- ✅ **Tools** — How to give AI the ability to interact with the world
- ✅ **RAG** — How to build knowledge systems for your agents
- ✅ **Streaming** — How to make responses feel alive and real-time
- ✅ **MCP** — Model Context Protocol for OS-level tool access
- ✅ **Multi-agent systems** — Agents collaborating together
- ✅ **Voice Interaction** — Real-time speech-to-text (STT) and text-to-speech (TTS)

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND                               │
│                     Next.js 15 Dashboard                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ tRPC / HTTPS / WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AEGIS OS — AGENT BACKEND                     │
│                  Node.js (Fastify) + OpenAI SDK                 │
├─────────────────────────────────────────────────────────────────┤
│  Agent Orchestrator  ←→  Agent Registry (configs, tools)        │
│         ↓                        ↓                              │
│  Reasoning Engine          Agent Types (convo, researcher...)   │
│  (ReAct, planning)              ↓                               │
│         ↓                  MCP Gateway                          │
│    TOOL LAYER              (OS-level access)                    │
│  (JSON schema fns)              ↓                               │
│         ↓                  KNOWLEDGEBASE                        │
│   RAG PIPELINE             (Supabase/pgvector)                  │
├─────────────────────────────────────────────────────────────────┤
│              STREAMING LAYER (SSE / WebSocket)                  │
│          Live tokens • Tool calls • Tool results                │
├─────────────────────────────────────────────────────────────────┤
│             VOICE INTEGRATION (Deepgram / ElevenLabs)           │
│          Real-time STT (Listening) • TTS (Speaking)             │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, Tailwind, Vercel AI SDK |
| **Backend** | Node.js, Fastify, TypeScript |
| **AI** | OpenAI SDK v4, Function calling, Streaming |
| **Database** | PostgreSQL + pgvector (Supabase) |
| **RAG** | text-embedding-3-large, LangChain |
| **Protocol** | MCP (Model Context Protocol) |
| **Communication** | tRPC, WebSocket, SSE |
| **Voice** | Deepgram (STT), ElevenLabs (TTS) |

---

## 🔧 Available Tools (Phase 2)

| Tool | Description | API Used |
|------|-------------|----------|
| 🧮 `calculator` | Math operations | Built-in |
| 🕐 `get_current_time` | Current date/time | Built-in |
| 🔍 `web_search` | Search the internet | DuckDuckGo (free) |
| 🌐 `http_fetch` | Fetch any URL | Native fetch |
| 🌤️ `get_weather` | Weather & forecast | Open-Meteo (free) |
| 📄 `read_file` | Read workspace files | Local filesystem |
| ✏️ `write_file` | Create/update files | Local filesystem |
| 📁 `list_directory` | List files | Local filesystem |

### 🔒 Safety Features
- **Path validation** — Prevents directory traversal attacks
- **URL validation** — Blocks localhost/internal networks
- **Size limits** — Max 1MB reads, 500KB writes
- **Timeouts** — 10 second max for HTTP requests
- **Sandboxing** — File tools restricted to `workspace/` directory

---

## 📁 Project Structure

```
aegis-os/
├── apps/
│   ├── web/                    # Next.js 15 frontend (Dashboard)
│   │   └── src/app/            # App router pages
│   └── agent-backend/          # Node agent engine (Fastify)
│       └── src/
│           ├── agents/         # Agent logic & registry
│           ├── tools/          # All tools organized by category
│           │   ├── calculator.ts
│           │   ├── time.ts
│           │   ├── web/search.ts
│           │   ├── weather/weather.ts
│           │   ├── filesystem/read.ts, write.ts, list.ts
│           │   └── http/fetch.ts
│           ├── routes/         # API endpoints
│           ├── utils/          # Validation & HTTP helpers
│           ├── voice/          # Real-time Voice Session & Providers
│           │   ├── providers/  # Deepgram STT & ElevenLabs TTS
│           │   ├── voice.config.ts # API configurations
│           │   └── voice.session.ts # WS session orchestrator
│           └── types/          # TypeScript definitions
├── docs/                       # Learning notes & diagrams
│   ├── phase-1-foundations/
│   └── phase-2-tools/
└── docker/                     # Deployment configs
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- pnpm (recommended) or npm
- OpenAI API key

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cd apps/agent-backend
cp env.example.txt .env
# Edit .env and add your OPENAI_API_KEY
```

### Running the Project

```bash
# Terminal 1 - Start the agent backend
pnpm dev

# Terminal 2 - Start the web UI
pnpm dev:web
```

Then open **http://localhost:3000** in your browser!

---

## 🧪 Test Your Agent

### Via the Web UI
Open http://localhost:3000 and try:
- "What is 25 * 48?"
- "What's the weather in Tokyo?"
- "Search for TypeScript tutorial"
- "List files in workspace"

### Via curl
```bash
# Chat with the agent
curl -X POST http://localhost:3001/agents/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is the weather in London?"}]}'

# Test a tool directly
curl -X POST http://localhost:3001/tools/calculator/test \
  -H "Content-Type: application/json" \
  -d '{"args": {"operation": "multiply", "a": 25, "b": 48}}'
```

---

## 🗣️ Voice Integration

Aegis OS supports real-time, low-latency voice interactions through its dedicated WebSockets pipeline (`/voice/ws`).

### Key Components:
- **STT (Speech-to-Text)**: Deepgram (`nova-2` model) ensures split-second transcription and silence detection.
- **TTS (Text-to-Speech)**: ElevenLabs (`eleven_turbo_v2_5` model) delivers rapid, human-like audio streaming.
- **`VoiceSession` Manager**: Orchestrates real-time state transitions (`listening` ↔ `thinking` ↔ `speaking`) and gracefully handles user barge-ins (interrupting the AI mid-sentence).
- **Concurrent Execution**: Audio streaming runs concurrently with the Agent's reasoning loop; speech responses are synthesized on-the-fly, sentence-by-sentence as tokens are generated.

---

## 🤝 Contributing

Feel free to:
- Add more tools
- Improve documentation
- Suggest better patterns
- Share your learnings
