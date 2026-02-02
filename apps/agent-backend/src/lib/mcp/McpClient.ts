import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { Tool } from "../../types/tool.js";
import { fileURLToPath } from "url";
import path from "path";

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class McpClientService {
  private client: Client;
  private transport: StdioClientTransport;

  constructor(serverPath: string) {
    this.transport = new StdioClientTransport({
      command: "node",
      args: [serverPath],
    });

    this.client = new Client(
      {
        name: "aegis-agent-client",
        version: "1.0.0",
      },
      {
        capabilities: {},
      }
    );
  }

  async connect() {
    await this.client.connect(this.transport);
    console.log("MCP Client connected.");
  }

  async getTools(): Promise<Tool[]> {
    const list = await this.client.listTools();
    
    return list.tools.map((mcpTool) => ({
      name: `mcp_${mcpTool.name}`, // Prefix to avoid collisions
      description: mcpTool.description || "",
      parameters: mcpTool.inputSchema as any,
      execute: async (args: any) => {
        const result = await this.client.callTool({
          name: mcpTool.name,
          arguments: args,
        }) as CallToolResult;
        
        // MCP results are content arrays. We need to simplify for our agent
        if (result.content && Array.isArray(result.content) && result.content.length > 0) {
           const textContent = result.content.find((c: any) => c.type === 'text');
           if (textContent && 'text' in textContent) {
             return { success: true, result: textContent.text };
           }
        }
        
        if (result.isError) {
          return { success: false, error: "MCP Tool Execution Failed" };
        }

        return { success: true, result: JSON.stringify(result) };
      },
    }));
  }
  
  async close() {
    await this.client.close();
  }
}
