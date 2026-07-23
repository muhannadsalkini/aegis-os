# 🛡️ Aegis OS — Security Audit Report

> **Auditor:** Automated Security Review  
> **Date:** 2026-03-29 | **Last Updated:** 2026-04-03 (H-02 fixed)  
> **Codebase:** Aegis OS (monorepo — `apps/agent-backend`, `apps/mcp-filesystem`, `apps/web`)  
> **Commit (audit):** `b9c51a73` | **Commit (latest):** `474643f3`

---

## Executive Summary

A full static security review of the Aegis OS codebase identified **26 security issues** across 5 severity levels. Since the initial audit **12 issues have been remediated**. **14 issues remain open**.

| Severity | Total | ✅ Fixed | 🔴 Open |
|----------|-------|---------|---------|
| 🔴 Critical | 5 | **5** | 0 |
| 🟠 High | 7 | **3** | 4 |
| 🟡 Medium | 8 | **2** | 6 |
| 🔵 Low | 4 | **1** | 3 |
| ⚪ Informational | 2 | **1** | 1 |
| **Total** | **26** | **12** | **14** |

---

## ✅ Fixed Issues

The following findings have been resolved since the initial report:

| ID | Title | Fix Summary |
|----|-------|-------------|
| **C-01** | No Authentication on Any API Endpoint | Supabase JWT middleware (`requireAuth`) registered globally in `server.ts`; full login flow added to web app (`apps/web/src/app/login/`, `AuthProvider`, Next.js middleware) |
| **C-02** | CORS Wildcard Origin with Credentials Enabled | CORS now uses an explicit origin allowlist built from `env.WEB_APP_URL`; no wildcard fallback possible |
| **C-03** | Unauthenticated Remote Tool Execution via `/tools/:name/test` | Endpoint now gated behind `env.NODE_ENV !== 'production'` |
| **C-04** | SSRF via `web_browse` Tool — No URL Validation | `validateUrl()` added to `browse.ts` before any `fetch()` call |
| **C-05** | Indirect Prompt Injection via Scraped Web Content | `sanitizeForLLM()` strips injection phrases; `wrapUntrustedContent()` adds trust-boundary markers — both applied in `browse.ts` |
| **H-01** | SSRF Bypass via Encoded/Alternate IP Representations | `validateUrl()` rewritten as async with: (1) encoded-IP detection (decimal/hex/octal), (2) DNS resolution validating every resolved IP against full private-range list including IPv6-mapped addresses |
| **H-02** | Direct Prompt Injection via Unfiltered User Messages | `role` enum in `chatRequestSchema` restricted to `['user', 'assistant']` (system role excluded); content capped at 10,000 chars; messages array capped at 50; same length limits applied to orchestrator `task`/`context` fields |
| **H-03** | Unauthenticated `/knowledge/list` Exposes Database Contents | Resolved as a side effect of C-01 — all routes now require a valid Supabase JWT |
| **L-01** | `/health` and `/` Endpoints Leak Version and Route Structure | Both endpoints now return minimal responses in production (`{ status: 'ok' }` / `{ name: 'Aegis OS API' }`) |
| **M-07** | Debug Tool Test Endpoint Not Gated by `NODE_ENV` | Resolved as part of C-03 fix |
| **I-02** | `WEB_APP_URL` Not Part of Zod Env Schema | `WEB_APP_URL` added to Zod `envSchema`; `server.ts` now uses `env.WEB_APP_URL` instead of raw `process.env` |

---

## Open Findings

---

## Table of Contents

- [High Findings](#high-findings)
  - [H-04: Supabase SERVICE\_ROLE\_KEY Used for All DB Operations (Bypasses RLS)](#h-04-supabase-service_role_key-used-for-all-db-operations-bypasses-rls)
  - [H-05: File Upload MIME Type Is Fully Client-Controlled](#h-05-file-upload-mime-type-is-fully-client-controlled)
  - [H-06: No Rate Limiting on Any Endpoint](#h-06-no-rate-limiting-on-any-endpoint)
  - [H-07: No Wall-Clock Timeout on the Agent Agentic Loop](#h-07-no-wall-clock-timeout-on-the-agent-agentic-loop)
- [Medium Findings](#medium-findings)
  - [M-01: MCP Filesystem Server Sandbox Root Is process.cwd()](#m-01-mcp-filesystem-server-sandbox-root-is-processcwd)
  - [M-02: Filesystem Tool WORKSPACE\_DIR Is a Relative Path](#m-02-filesystem-tool-workspace_dir-is-a-relative-path)
  - [M-03: activeDelegations Global Singleton — Race Condition & Memory Leak](#m-03-activedelegations-global-singleton--race-condition--memory-leak)
  - [M-04: SSE Stream Hardcodes Access-Control-Allow-Origin: \*](#m-04-sse-stream-hardcodes-access-control-allow-origin-)
  - [M-05: Internal Error Messages Leaked to API Clients](#m-05-internal-error-messages-leaked-to-api-clients)
  - [M-06: No File Upload Quota or Document Count Limit](#m-06-no-file-upload-quota-or-document-count-limit)
  - [M-08: uncaughtException Handler Silently Suppresses All Errors](#m-08-uncaughtexception-handler-silently-suppresses-all-errors)
- [Low Findings](#low-findings)
  - [L-02: WebSocket /voice/ws Has No Authentication](#l-02-websocket-voicews-has-no-authentication)
  - [L-03: search\_knowledgebase Tool Has No Query Length Limit](#l-03-search_knowledgebase-tool-has-no-query-length-limit)
  - [L-04: PDF Parsing Without Content Sandboxing](#l-04-pdf-parsing-without-content-sandboxing)
- [Informational Findings](#informational-findings)
  - [I-01: (store as any).client Breaks Type Safety](#i-01-store-as-anyclient-breaks-type-safety)
- [Remediation Roadmap](#remediation-roadmap)

---

## High Findings

---

### H-04: Supabase SERVICE_ROLE_KEY Used for All DB Operations (Bypasses RLS)

**Severity:** 🟠 High  
**Affected File:** `apps/agent-backend/src/shared/lib/rag/store.ts`

**Description:**  
The `VectorStore` class initializes the Supabase client using `SUPABASE_SERVICE_ROLE_KEY`. The service role key is a superuser key that completely bypasses Supabase's Row Level Security (RLS) policies. This means:

1. Any bug that allows arbitrary query manipulation (e.g., SQL injection through user-controlled metadata) will have unrestricted database access.
2. RLS policies designed to segregate data between users are silently bypassed.
3. If the key is ever leaked, an attacker has full database read/write/delete access.

**Fix:**  
Use the `anon` (public) key for read operations and configure proper RLS policies:

```sql
-- In Supabase SQL editor:
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

-- Allow reads for authenticated users only
CREATE POLICY "Authenticated users can read documents"
  ON documents FOR SELECT
  USING (auth.role() = 'authenticated');
```

```typescript
// Use anon key for searches, service key only for inserts
const anonClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY);
const serviceClient = createClient(env.SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
```

---

### H-05: File Upload MIME Type Is Fully Client-Controlled

**Severity:** 🟠 High  
**Affected File:** `apps/agent-backend/src/modules/knowledge/knowledge.route.ts`

**Description:**  
When a file is uploaded to `/knowledge/upload`, the `mimetype` field comes directly from the HTTP multipart request headers — it is provided by the client and can be set to any value. The `parseDocument()` function trusts this value to decide how to process the file:

```typescript
// mimetype is attacker-controlled:
const parseResult = await parseDocument(buffer, data.mimetype);
```

An attacker could:
1. Upload an executable/binary file claiming it is `text/plain` to get its raw bytes stored in the vector DB.
2. Upload a crafted PDF claiming to be `application/json` (or vice versa) to trigger parsing edge cases.
3. Attempt to exploit vulnerabilities in the `pdf-parse` library by uploading malformed PDFs.

**Fix:**  
Validate file type using **magic bytes** (file signatures), not the client-supplied MIME type:

```typescript
import { fileTypeFromBuffer } from 'file-type'; // npm install file-type

const buffer = await data.toBuffer();

// Detect actual file type from content
const detected = await fileTypeFromBuffer(buffer);
const allowedTypes = ['application/pdf', 'text/plain'];

if (detected && !allowedTypes.includes(detected.mime)) {
  return reply.status(400).send({ 
    success: false, 
    error: `File type not allowed: ${detected.mime}` 
  });
}

// Use detected type, not client-supplied type
const mimeToUse = detected?.mime ?? 'text/plain';
const parseResult = await parseDocument(buffer, mimeToUse);
```

---

### H-06: No Rate Limiting on Any Endpoint

**Severity:** 🟠 High  
**Affected Files:** All route files

**Description:**  
There is no rate limiting on any endpoint. Even with authentication in place, a single authenticated user can send unlimited requests and incur significant API costs:

| Endpoint | Cost per call |
|----------|--------------|
| `POST /agents/chat` | OpenAI API ($0.001–$0.01+) |
| `POST /agents/chat/stream` | OpenAI API |
| `POST /api/orchestrator` | Multiple OpenAI calls |
| `POST /knowledge/upload` | OpenAI Embeddings API |
| `POST /knowledge/search` | OpenAI Embeddings API |
| `GET /voice/ws` | Deepgram + ElevenLabs APIs |

**Fix:**  
Use `@fastify/rate-limit`:

```bash
pnpm add @fastify/rate-limit
```

```typescript
import rateLimit from '@fastify/rate-limit';

await fastify.register(rateLimit, {
  global: true,
  max: 60,          // 60 requests
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({
    success: false,
    error: 'Too many requests, please slow down.',
  }),
});

// Stricter limits for expensive AI endpoints:
fastify.post('/agents/chat', {
  config: { rateLimit: { max: 10, timeWindow: '1 minute' } }
}, handler);

fastify.post('/api/orchestrator', {
  config: { rateLimit: { max: 5, timeWindow: '1 minute' } }
}, handler);
```

---

### H-07: No Wall-Clock Timeout on the Agent Agentic Loop

**Severity:** 🟠 High  
**Affected File:** `apps/agent-backend/src/modules/agents/base-agent.ts`

**Description:**  
The agent's `chat()` and `chatStream()` methods loop up to `MAX_ITERATIONS = 10` times, but there is no wall-clock timeout. Each iteration calls OpenAI with tools that can themselves make further HTTP requests. A crafted input that causes the agent to consistently request tool calls can keep a request alive for many minutes, consuming server resources and OpenAI API budget.

**Fix:**  
Wrap the loop with a timeout using `Promise.race`:

```typescript
const AGENT_TIMEOUT_MS = 60_000; // 60 seconds max

async chat(context: AgentContext): Promise<AgentResponse> {
  return Promise.race([
    this._chatInternal(context),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Agent timed out after 60 seconds')), AGENT_TIMEOUT_MS)
    ),
  ]);
}
```

---

## Medium Findings

---

### M-01: MCP Filesystem Server Sandbox Root Is process.cwd()

**Severity:** 🟡 Medium  
**Affected File:** `apps/mcp-filesystem/src/index.ts`

**Description:**  
The MCP filesystem server sets its allowed root to `process.cwd()`:

```typescript
const ALLOWED_ROOT = process.cwd(); // In a real app, strict sandbox
```

This means the sandbox boundary changes depending on the current working directory when the server process is launched. If launched from the repo root or `/`, the entire filesystem may be accessible. Additionally, unlike the agent-backend's `validateFilePath()`, the MCP server has **no blocklist for sensitive files** (`.env`, `.ssh`, credentials, etc.).

**Fix:**
```typescript
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ALLOWED_ROOT = path.resolve(__dirname, '../../workspace'); // explicit sandbox

// Add a sensitive file blocklist:
const SENSITIVE_PATTERNS = [/\.env/i, /\.git/i, /\.ssh/i, /node_modules/i, /secret/i, /credential/i];

function validatePath(requestedPath: string): string {
  const absolutePath = path.resolve(ALLOWED_ROOT, requestedPath);
  if (!absolutePath.startsWith(ALLOWED_ROOT)) {
    throw new Error(`Access denied: path outside sandbox`);
  }
  if (SENSITIVE_PATTERNS.some(p => p.test(absolutePath))) {
    throw new Error(`Access denied: sensitive file`);
  }
  return absolutePath;
}
```

---

### M-02: Filesystem Tool WORKSPACE_DIR Is a Relative Path

**Severity:** 🟡 Medium  
**Affected Files:**
- `apps/agent-backend/src/modules/tools/filesystem/read.ts`
- `apps/agent-backend/src/modules/tools/filesystem/write.ts`
- `apps/agent-backend/src/modules/tools/filesystem/list.ts`

**Description:**  
All three filesystem tools use `const WORKSPACE_DIR = './workspace'`. This relative path is resolved relative to the Node.js process's current working directory (`process.cwd()`) at the time `path.resolve()` is called. If the application is deployed to a platform like Vercel or started from a different directory, the workspace will resolve to an unexpected location — potentially outside the intended sandbox.

**Fix:**  
Use `import.meta.url` to derive an absolute path that is stable regardless of where the process is started:

```typescript
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolves to: <repo>/apps/agent-backend/workspace
const WORKSPACE_DIR = path.resolve(__dirname, '../../../../../workspace');
```

---

### M-03: activeDelegations Global Singleton — Race Condition & Memory Leak

**Severity:** 🟡 Medium  
**Affected File:** `apps/agent-backend/src/modules/tools/orchestrator/delegate.ts`

**Description:**  
The `activeDelegations` set is a module-level singleton shared across all concurrent requests:

```typescript
const activeDelegations = new Set<string>(); // module-level global
```

The delegation key is based on only the first 50 characters of the task string. This causes two problems:
1. **Race condition**: Two different users submitting tasks that share the same first 50 characters for the same agent will have one rejected as "circular delegation."
2. **Memory leak / permanent lock**: If an unhandled exception bypasses the `finally` clause, the delegation key is never removed, permanently blocking future delegation.

**Fix:**
```typescript
import { randomUUID } from 'crypto';

async execute(args) {
  const delegationId = randomUUID(); // Unique per call, not content-based
  activeDelegations.add(delegationId);
  
  try {
    // ... delegation logic
  } finally {
    activeDelegations.delete(delegationId); // Always runs
  }
}
```

---

### M-04: SSE Stream Hardcodes Access-Control-Allow-Origin: *

**Severity:** 🟡 Medium  
**Affected File:** `apps/agent-backend/src/modules/agents/agent.route.ts`

**Description:**  
The streaming endpoint manually sets response headers that bypass the server-level CORS policy (which is now properly restricted to an allowlist):

```typescript
reply.raw.setHeader('Access-Control-Allow-Origin', '*'); // Hardcoded wildcard
```

This means even though the server-level CORS is configured to only allow specific origins, the SSE streaming endpoint allows cross-origin access from **any** site, exposing the full response stream to unauthorized origins.

**Fix:**  
Remove the manual CORS header entirely and let the `@fastify/cors` plugin handle it:

```typescript
// Remove this line:
// reply.raw.setHeader('Access-Control-Allow-Origin', '*');

// The cors plugin registered at server level handles this correctly.
```

---

### M-05: Internal Error Messages Leaked to API Clients

**Severity:** 🟡 Medium  
**Affected Files:** All route files, especially `knowledge.route.ts`

**Description:**  
Throughout the codebase, internal error messages (including database errors, third-party API errors, and Node.js runtime errors) are returned directly to the client:

```typescript
// In knowledge.route.ts:
if (error) {
  return reply.status(500).send({ success: false, error: error.message }); // Leaks DB error details
}
```

This can expose sensitive information including: database schema details, internal service URLs, and implementation details that help attackers craft more targeted attacks.

**Fix:**  
Use generic error messages for clients and log the full error server-side only:

```typescript
// Generic client error:
return reply.status(500).send({ success: false, error: 'An internal error occurred.' });

// Full error logged server-side:
fastify.log.error({ err: error, path: request.url }, 'Internal server error');
```

Consider a centralized error handler:
```typescript
fastify.setErrorHandler((error, request, reply) => {
  fastify.log.error(error);
  reply.status(500).send({ success: false, error: 'Internal server error' });
});
```

---

### M-06: No File Upload Quota or Document Count Limit

**Severity:** 🟡 Medium  
**Affected File:** `apps/agent-backend/src/modules/knowledge/knowledge.route.ts`

**Description:**  
The knowledge upload endpoint has a 10MB per-file size limit, but there is no limit on:
- Total number of documents uploaded
- Total storage used in the vector database
- Number of chunks generated per document (a 10MB text file could produce thousands of chunks)

This enables a storage exhaustion Denial of Service attack even from authenticated users.

**Fix:**
```typescript
const store = new VectorStore();
const { count } = await store.getDocumentCount();
const MAX_DOCUMENTS = 1000;

if (count >= MAX_DOCUMENTS) {
  return reply.status(429).send({
    success: false,
    error: `Document limit reached (max: ${MAX_DOCUMENTS})`,
  });
}

// Also limit chunk count per document:
const MAX_CHUNKS_PER_DOCUMENT = 500;
if (textChunks.length > MAX_CHUNKS_PER_DOCUMENT) {
  textChunks.splice(MAX_CHUNKS_PER_DOCUMENT);
}
```

---

### M-08: uncaughtException Handler Silently Suppresses All Errors

**Severity:** 🟡 Medium  
**Affected File:** `apps/agent-backend/src/server.ts`

**Description:**  
The bootstrap function registers global error handlers that suppress all unhandled exceptions, logging only `err.message` (not the full stack trace):

```typescript
process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught Exception (server kept alive):', err.message); // Stack trace hidden
});
```

This hides the full context needed to diagnose security incidents.

**Fix:**
```typescript
process.on('uncaughtException', (err) => {
  // Log full error with stack to structured logger
  fastify.log.fatal({ err, stack: err.stack }, 'Uncaught Exception');
  // Consider sending an alert to an on-call system
});
```

---

## Low Findings

---

### L-02: WebSocket /voice/ws Has No Standard Bearer Authentication

**Severity:** 🔵 Low  
**Affected File:** `apps/agent-backend/src/modules/voice/voice.route.ts`

**Description:**  
The global `requireAuth` JWT middleware explicitly skips `/voice/ws` routes (via `PUBLIC_PREFIXES`), relying on a separate "ticket mechanism" implemented in `ticket-store.ts`. If the ticket mechanism is not correctly validated on every WebSocket connection, any caller can open a WebSocket and begin consuming Deepgram/ElevenLabs/OpenAI API quota.

**Recommendation:**  
Ensure the ticket-based auth in the voice route is always enforced, tickets are single-use, and they expire within a short window (e.g., 30 seconds). Log and alert on rejected connection attempts.

---

### L-03: search_knowledgebase Tool Has No Query Length Limit

**Severity:** 🔵 Low  
**Affected File:** `apps/agent-backend/src/modules/tools/knowledge/search.ts`

**Description:**  
The `search_knowledgebase` tool accepts a `query` string with no length validation before passing it to `generateEmbeddings()`, which calls the OpenAI Embeddings API. Very long queries can exceed the embedding model's token limit (8191 tokens for `text-embedding-3-small`) or incur unnecessary API costs.

**Fix:**
```typescript
const sanitizedQuery = (args.query as string).trim().slice(0, 2000);
if (!sanitizedQuery) {
  return { success: false, error: 'Query cannot be empty' };
}
const embeddings = await generateEmbeddings([sanitizedQuery]);
```

---

### L-04: PDF Parsing Without Content Sandboxing

**Severity:** 🔵 Low  
**Affected File:** `apps/agent-backend/src/shared/lib/rag/parser.ts`

**Description:**  
PDF files uploaded to the knowledge base are parsed using `pdf-parse` without any content sandboxing. Crafted PDFs with extremely large or deeply nested structures can cause out-of-memory conditions (PDF bombs). Extracted PDF text should also be checked for LLM injection content.

**Fix:**
```typescript
async function parsePdf(buffer: Buffer): Promise<ParseResult> {
  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('PDF file too large to process safely');
  }
  
  return Promise.race([
    (async () => {
      const pdf = require('pdf-parse');
      const data = await pdf(buffer, { max: 50 }); // max 50 pages
      return { text: data.text, metadata: { pages: data.numpages } };
    })(),
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('PDF parsing timeout')), 10_000)
    ),
  ]);
}
```

---

## Informational Findings

---

### I-01: (store as any).client Breaks Type Safety

**Severity:** ⚪ Informational  
**Affected File:** `apps/agent-backend/src/modules/knowledge/knowledge.route.ts`

**Description:**  
The `/knowledge/list` debug endpoint bypasses TypeScript's type system to access a private class member:

```typescript
const client = (store as any).client; // Bypasses private access modifier
```

This is an anti-pattern that defeats the purpose of the `private` modifier and will silently break if `VectorStore` internals are refactored.

**Fix:**  
Add a proper public method to `VectorStore`:

```typescript
// In store.ts:
async listDocuments(limit = 10): Promise<{ id: string; content: string; metadata: Record<string, any> }[]> {
  const { data, error } = await this.client
    .from(this.tableName)
    .select('id, content, metadata')
    .limit(limit);
  
  if (error) throw new Error(error.message);
  return data ?? [];
}
```

---

## Remediation Roadmap

Prioritized list of **remaining open** fixes ordered by impact vs. effort:

### 🔴 Short Term (within 1 sprint)

| Priority | Issue | Effort |
|----------|-------|--------|
| 1 | **M-04** — Remove hardcoded `Access-Control-Allow-Origin: *` from SSE route | Very Low |
| 2 | **H-06** — Add rate limiting with `@fastify/rate-limit` | Low |
| 3 | **H-07** — Add wall-clock timeout to agent loop | Low |
| 4 | **H-05** — Validate file type by magic bytes | Medium |

### 🟠 Medium Term (within 2–4 sprints)

| Priority | Issue | Effort |
|----------|-------|--------|
| 5 | **H-04** — Configure proper Supabase RLS, use anon key where possible | Medium |
| 6 | **M-01** — Fix MCP server sandbox to use explicit absolute path + blocklist | Low |
| 7 | **M-02** — Fix `WORKSPACE_DIR` to use `import.meta.url`-based absolute path | Very Low |
| 8 | **M-05** — Centralize error handling, return generic messages to clients | Low |
| 9 | **M-03** — Replace content-based delegation key with UUID | Very Low |
| 10 | **L-02** — Audit and harden WebSocket ticket-based authentication | Low |

### 🟡 Long Term (hardening)

| Priority | Issue | Effort |
|----------|-------|--------|
| 11 | **M-06** — Add upload quotas and chunk limits | Low |
| 12 | **M-08** — Integrate structured logging for security events | Medium |
| 13 | **L-03** — Add query length limit to knowledge search tool | Very Low |
| 14 | **L-04** — Add PDF parsing timeout and page limit | Low |
| 15 | **I-01** — Add `listDocuments()` public method to `VectorStore` | Very Low |

---

*This report was generated by automated static analysis on 2026-03-29 and updated on 2026-04-03. All findings should be verified in context before remediation. The absence of a finding does not guarantee the absence of a vulnerability.*
