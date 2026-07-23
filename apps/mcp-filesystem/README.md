# mcp-filesystem

## Purpose
A standalone Model Context Protocol (MCP) server that exposes basic filesystem operations (read, write, list) to MCP clients over stdio. It exists so the agent backend can consume filesystem tools through the standard MCP interface rather than implementing them inline, demonstrating the MCP integration pattern in Aegis OS.

## Boundaries
- Does **not** speak HTTP — it communicates only over stdio (`StdioServerTransport`), spawned as a child process by an MCP client.
- Does **not** know about agents, LLMs, or Aegis auth — it is a generic, reusable MCP server.
- Does **not** enforce workspace scoping the way the backend's own filesystem tools do; its sandbox root is `process.cwd()` of the spawned process (see Gotchas).

## Public surface
Single entry point: `src/index.ts` (shebang CLI, runs `main()` on start).

MCP tools advertised via `ListToolsRequestSchema`:
- `read_file` — read the complete UTF-8 contents of a file. Params: `path`.
- `write_file` — create or overwrite a file (creates parent dirs). Params: `path`, `content`.
- `list_directory` — list files/directories (name + `file`/`directory` type). Params: `path` (optional, default `.`).

Internal helper:
- `validatePath(requestedPath)` — resolves against `ALLOWED_ROOT` and throws if the result escapes it.

## Dependencies
Internal: none — this app imports nothing from other Aegis packages. It is consumed by `apps/agent-backend`, which spawns its built `dist/index.js` over stdio via `McpClientService`. That is the only inbound dependency, and it crosses an app boundary (backend → this build artifact).

External: `@modelcontextprotocol/sdk` (Server, StdioServerTransport, request schemas), `zod` (argument validation), Node `fs/promises` + `path`.

## Key flows
1. **Startup**: `main()` creates a `Server` (name `mcp-filesystem`, version `0.1.0`) declaring the `tools` capability, connects a `StdioServerTransport`, and logs readiness to stderr.
2. **List tools**: client sends a list-tools request → handler returns the static `TOOLS` array with JSON input schemas.
3. **Call tool**: client sends a call-tool request → args are parsed with a per-tool Zod schema → `validatePath()` resolves/guards the path → the fs operation runs → result is returned as an MCP `content: [{ type: "text", ... }]` array. Any thrown error is caught and returned as `{ content: [...], isError: true }` rather than crashing the process.

## Rules and constraints
- **Every path must pass through `validatePath()` before any fs call.** Reason: prevents traversal outside `ALLOWED_ROOT` (`../../etc/passwd`-style escapes).
- **Tool handlers must return errors as `isError: true` content, not throw uncaught.** Reason: an MCP server should stay alive across failed calls; the client surfaces the error text to the agent.
- **Log only to stderr, never stdout.** Reason: stdout is the MCP JSON-RPC channel — writing to it corrupts the protocol stream (`console.error` is used deliberately).
- **Validate all tool arguments with Zod before use.** Reason: arguments come from an untrusted client and must be shape-checked.

## Gotchas
- **The sandbox root is `process.cwd()`**, not a fixed workspace. Because the backend spawns this process, `ALLOWED_ROOT` is whatever directory the backend launched from — the effective sandbox depends on the caller's CWD, which is easy to get wrong. `TODO: verify` the intended root in the deployed setup.
- **`validatePath` uses `startsWith(ALLOWED_ROOT)`**, a prefix check that can be fooled by sibling directories sharing a name prefix (e.g. root `/app` vs `/app-secrets`). Comment in-code even flags "In a real app, strict sandbox."
- **Tools are collision-prefixed on the client side**, not here — `McpClientService` renames them to `mcp_read_file`, etc. This server advertises the bare names.
- **Must be built (`dist/index.js`) before the backend can use it**; otherwise the backend's MCP init step is skipped with a warning.

---
Source files read: `package.json`, `tsconfig.json`, `src/index.ts`; plus the backend consumer `apps/agent-backend/src/shared/lib/mcp/McpClient.ts` and `src/modules/tools/index.ts`.
