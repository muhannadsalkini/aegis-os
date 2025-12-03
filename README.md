# 🛡️ Aegis OS — Your AI Agent Operating System

> Build your own AI agents with tools, RAG knowledgebases, MCP support, and real-time streaming.

## 🎯 What is Aegis OS?

Aegis OS is a **learning-focused project** that teaches you how to build AI agents from scratch. Think of it as your personal Copilot Studio, but cooler.

By the end of this project, you'll understand:
- ✅ **Agents** — How LLMs become autonomous workers
- ✅ **Tools** — How to give AI the ability to interact with the world
- ✅ **RAG** — How to build knowledge systems for your agents
- ✅ **Streaming** — How to make responses feel alive and real-time
- ✅ **MCP** — Model Context Protocol for OS-level tool access
- ✅ **Multi-agent systems** — Agents collaborating together

---

## 📚 Learning Roadmap

| Phase | Focus | Duration |
|-------|-------|----------|
| 1️⃣ | **Foundations** — LLM function calling, first tool | 5-7 days |
| 2️⃣ | **Tooling Mastery** — 3-5 tools, safety patterns | 7-10 days |
| 3️⃣ | **RAG & Knowledgebases** — Embeddings, chunking, retrieval | 10-14 days |
| 4️⃣ | **Agent Types** — Researcher, Planner, Orchestrator | 7-12 days |
| 5️⃣ | **MCP Integration** — Model Context Protocol | 7-10 days |
| 6️⃣ | **Streaming Everything** — Real-time UI | 5-7 days |
| 7️⃣ | **Final Assembly** — Full Aegis OS deployment | Final |

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                          FRONTEND                                │
│                     Next.js 15 Dashboard                        │
└───────────────────────────┬─────────────────────────────────────┘
                            │ tRPC / HTTPS / WebSocket
                            ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AEGIS OS — AGENT BACKEND                      │
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
│              STREAMING LAYER (SSE / WebSocket)                   │
│          Live tokens • Tool calls • Tool results                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| **Frontend** | Next.js 15, React 19, Tailwind, Vercel AI SDK |
| **Backend** | Node.js, Fastify, TypeScript |
| **AI** | OpenAI SDK v2, Function calling, Streaming |
| **Database** | PostgreSQL + pgvector (Supabase) |
| **RAG** | text-embedding-3-large, LangChain |
| **Protocol** | MCP (Model Context Protocol) |
| **Communication** | tRPC, WebSocket, SSE |

---

## 📁 Project Structure

```
aegis-os/
├── apps/
│   ├── web/                    # Next.js 15 frontend (Dashboard)
│   └── agent-backend/          # Node agent engine (Fastify)
├── packages/
│   ├── shared-types/           # Zod schemas, shared types
│   ├── ui/                     # Shared UI components
│   └── sdk/                    # JS SDK for agents
├── docs/                       # Learning notes & diagrams
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
# Clone the repository
cd Aegis-OS

# Install dependencies
pnpm install

# Set up environment variables
cp apps/agent-backend/.env.example apps/agent-backend/.env
# Add your OPENAI_API_KEY to the .env file

# Start the agent backend (Phase 1)
pnpm --filter agent-backend dev
```

---

## 📖 Phase 1: Foundations

**Goal:** Understand how LLMs do function calling and build your first "tiny agent"

### What You'll Learn:
1. **Function Calling** — How LLMs decide when and how to use tools
2. **Tool Schema** — JSON Schema format for defining tool inputs
3. **Tool Execution** — How to run tools and feed results back to the model
4. **Streaming Basics** — Server-Sent Events (SSE) and ReadableStream

### Your First Artifact:
A simple chat that can call a calculator tool during the conversation.

---

## 📝 Learning Notes

Each phase includes detailed notes explaining concepts. Check the `docs/` folder:

- `docs/phase-1-foundations/` — Function calling, tools, streaming basics
- `docs/phase-2-tools/` — Tool architecture, safety patterns
- `docs/phase-3-rag/` — Embeddings, chunking, retrieval
- ... and more

---

## 🤝 Contributing

This is a learning project! Feel free to:
- Add more tools
- Improve documentation
- Suggest better patterns
- Share your learnings

---

## 📜 License

MIT License — Learn, build, and ship!

---

<p align="center">
  <strong>Built with 💜 to understand AI agents from the ground up</strong>
</p>


