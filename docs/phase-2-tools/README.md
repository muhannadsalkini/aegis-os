# 🛠️ Phase 2: Tooling Mastery

> **Goal:** Teach your agent to touch the world with real, useful tools

## 🎯 What You'll Learn

By the end of this phase, you'll understand:

1. **Tool Architecture** — How to design robust, reusable tools
2. **Async Tools** — Handling external API calls and delays
3. **Tool Safety** — Controlling what tools can do, validation, sandboxing
4. **Error Handling** — Graceful failures and informative errors
5. **Tool Composition** — Tools that work together

---

## 📚 Core Concept: Tool Design Principles

### The Anatomy of a Great Tool

```
┌─────────────────────────────────────────────────────────────────┐
│                       TOOL DESIGN                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. CLEAR NAME                                                  │
│     • Use verb_noun format: read_file, search_web, send_email   │
│     • Be specific: "get_weather" not "weather"                  │
│                                                                 │
│  2. EXCELLENT DESCRIPTION                                       │
│     • Tell the AI WHEN to use it                                │
│     • List what it CAN and CANNOT do                            │
│     • Include examples if helpful                               │
│                                                                 │
│  3. STRICT PARAMETERS                                           │
│     • Use JSON Schema constraints                               │
│     • Mark required vs optional clearly                         │
│     • Use enums for fixed choices                               │
│                                                                 │
│  4. SAFE EXECUTION                                              │
│     • Validate ALL inputs                                       │
│     • Set timeouts for external calls                           │
│     • Never trust user input blindly                            │
│                                                                 │
│  5. INFORMATIVE RESULTS                                         │
│     • Return structured data                                    │
│     • Include success/error status                              │
│     • Provide context for the AI                                │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔧 Tools We'll Build

| Tool | Purpose | External API |
|------|---------|--------------|
| `web_search` | Search the internet | DuckDuckGo (free) |
| `read_file` | Read local files | None |
| `write_file` | Write local files | None |
| `get_weather` | Get weather data | Open-Meteo (free) |
| `http_fetch` | Fetch any URL | None |

---

## 🔒 Tool Safety Patterns

### 1. Input Validation

Always validate inputs before execution:

```typescript
// BAD - trusting input blindly
const content = await fs.readFile(args.path);

// GOOD - validate first
const safePath = validatePath(args.path);
if (!safePath.allowed) {
  return { success: false, error: safePath.reason };
}
const content = await fs.readFile(safePath.path);
```

### 2. Sandboxing

Restrict what tools can access:

```typescript
const ALLOWED_DIRECTORIES = [
  './workspace',
  './uploads',
];

function isPathAllowed(path: string): boolean {
  const resolved = path.resolve(path);
  return ALLOWED_DIRECTORIES.some(dir => 
    resolved.startsWith(path.resolve(dir))
  );
}
```

### 3. Rate Limiting

Prevent abuse of external APIs:

```typescript
const rateLimiter = new Map<string, number>();
const RATE_LIMIT = 10; // requests per minute

function checkRateLimit(toolName: string): boolean {
  const count = rateLimiter.get(toolName) || 0;
  if (count >= RATE_LIMIT) return false;
  rateLimiter.set(toolName, count + 1);
  return true;
}
```

### 4. Timeouts

Never let external calls hang forever:

```typescript
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 10000);

try {
  const response = await fetch(url, { signal: controller.signal });
} finally {
  clearTimeout(timeout);
}
```

---

## 📁 Key Files

| File | Purpose |
|------|---------|
| `tools/web/search.ts` | Web search using DuckDuckGo |
| `tools/filesystem/read.ts` | Safe file reading |
| `tools/filesystem/write.ts` | Safe file writing |
| `tools/http/fetch.ts` | Generic HTTP fetcher |
| `tools/weather/weather.ts` | Weather API integration |
| `utils/validation.ts` | Input validation helpers |
| `utils/safety.ts` | Safety utilities |

---

## 🧪 Testing Your Tools

### Test a tool directly:

```bash
# Test web search
curl -X POST http://localhost:3001/tools/web_search/test \
  -H "Content-Type: application/json" \
  -d '{"args": {"query": "TypeScript tutorial"}}'

# Test weather
curl -X POST http://localhost:3001/tools/get_weather/test \
  -H "Content-Type: application/json" \
  -d '{"args": {"city": "London"}}'
```

### Test through the agent:

```bash
curl -X POST http://localhost:3001/agents/chat \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "What is the weather in Tokyo?"}]}'
```

---

## 🎓 Key Takeaways

1. **Tools are the agent's hands** — They let it interact with the world
2. **Safety first** — Always validate, sanitize, and limit
3. **Clear descriptions** — The AI needs to understand when to use each tool
4. **Structured results** — Return data the AI can reason about
5. **Graceful failures** — Errors should be informative, not cryptic

---

## ➡️ Next Phase

Once you've mastered tools, move on to:
**Phase 3: RAG & Knowledgebases** — Give your agent long-term memory!

