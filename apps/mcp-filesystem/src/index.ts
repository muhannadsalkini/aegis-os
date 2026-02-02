#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";

/**
 * MCP Filesystem Server
 * Exposes basic filesystem operations to MCP clients.
 * Restricted to the current working directory for safety.
 */

// Configuration
const SERVER_NAME = "mcp-filesystem";
const SERVER_VERSION = "0.1.0";
const ALLOWED_ROOT = process.cwd(); // In a real app, strict sandbox

// Helper: Validate path
function validatePath(requestedPath: string): string {
  const absolutePath = path.resolve(ALLOWED_ROOT, requestedPath);
  if (!absolutePath.startsWith(ALLOWED_ROOT)) {
    throw new Error(`Access denied: Path ${requestedPath} is outside allowed root.`);
  }
  return absolutePath;
}

// Tool Definitions
const TOOLS: Tool[] = [
  {
    name: "read_file",
    description: "Read the complete contents of a file (utf-8).",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file" },
      },
      required: ["path"],
    },
  },
  {
    name: "write_file",
    description: "Create or overwrite a file with new content.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the file" },
        content: { type: "string", description: "Content to write" },
      },
      required: ["path", "content"],
    },
  },
  {
    name: "list_directory",
    description: "List files and directories in a folder.",
    inputSchema: {
      type: "object",
      properties: {
        path: { type: "string", description: "Path to the directory (default: current)" },
      },
    },
  },
];

// Server Implementation
const server = new Server(
  {
    name: SERVER_NAME,
    version: SERVER_VERSION,
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Handler: List Tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: TOOLS,
  };
});

// Handler: Call Tool
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (!args) {
    throw new Error("No arguments provided");
  }

  try {
    switch (name) {
      case "read_file": {
        const { path: filePath } = z.object({ path: z.string() }).parse(args);
        const safePath = validatePath(filePath);
        const content = await fs.readFile(safePath, "utf-8");
        return {
          content: [{ type: "text", text: content }],
        };
      }

      case "write_file": {
        const { path: filePath, content } = z
          .object({ path: z.string(), content: z.string() })
          .parse(args);
        const safePath = validatePath(filePath);
        await fs.mkdir(path.dirname(safePath), { recursive: true });
        await fs.writeFile(safePath, content, "utf-8");
        return {
          content: [{ type: "text", text: `Successfully wrote to ${filePath}` }],
        };
      }

      case "list_directory": {
        const { path: dirPath } = z
          .object({ path: z.string().optional() })
          .parse(args);
        const targetPath = dirPath || ".";
        const safePath = validatePath(targetPath);
        
        const items = await fs.readdir(safePath, { withFileTypes: true });
        const listing = items.map((item) => ({
          name: item.name,
          type: item.isDirectory() ? "directory" : "file",
        }));

        return {
          content: [{ type: "text", text: JSON.stringify(listing, null, 2) }],
        };
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return {
      content: [{ type: "text", text: `Error: ${errorMessage}` }],
      isError: true,
    };
  }
});

// Start Server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP Filesystem Server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
