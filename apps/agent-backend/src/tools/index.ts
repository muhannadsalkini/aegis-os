/**
 * ==========================================
 * Tool Registry Entry Point
 * ==========================================
 */

import type { Tool } from '../types/tool.js';
import { McpClientService } from '../lib/mcp/McpClient.js';
import { registerTool } from './registry.js';
import path from 'path';

// Phase 1 Tools
import { calculatorTool } from './calculator.js';
import { timeTool } from './time.js';

// Phase 2 Tools - Web & HTTP
import { webSearchTool } from './web/search.js';
import { httpFetchTool } from './http/fetch.js';
import { webBrowseTool } from './web/browse.js';
import { summarizeTool } from './web/summarize.js';

// Phase 2 Tools - Weather
import { weatherTool } from './weather/weather.js';

// Phase 2 Tools - Filesystem
import { readFileTool } from './filesystem/read.js';
import { writeFileTool } from './filesystem/write.js';
import { listDirectoryTool } from './filesystem/list.js';

// Phase 3 Tools - Knowledge Base
import { searchKnowledgebaseTool } from './knowledge/search.js';

// Phase 4 Tools - Planning
import { taskDecompositionTool } from './planner/decompose.js';
import { goalValidationTool } from './planner/validate.js';

// Phase 4 Tools - Orchestration
import { agentDelegationTool } from './orchestrator/delegate.js';
import { agentCoordinationTool } from './orchestrator/coordinate.js';

// Helper to register initial tools
const initialTools: Tool[] = [
  calculatorTool,
  timeTool,
  webSearchTool,
  httpFetchTool,
  webBrowseTool,
  summarizeTool,
  weatherTool,
  readFileTool,
  writeFileTool,
  listDirectoryTool,
  searchKnowledgebaseTool,
  taskDecompositionTool,
  goalValidationTool,
  agentDelegationTool,
  agentCoordinationTool
];

console.log('\n📦 Registering tools...');
initialTools.forEach(registerTool);

/**
 * Initialize MCP Tools
 */
export async function initializeMcpTools() {
  try {
    // Resolve path relative to CWD (which is typically apps/agent-backend)
    // We want ../mcp-filesystem/dist/index.js
    const mcpServerPath = path.resolve(process.cwd(), '../mcp-filesystem/dist/index.js');
    console.log(`🔌 Connecting to MCP Server at: ${mcpServerPath}`);
    
    // Check if file exists roughly (optional, but good for debugging)
    // const fs = await import('fs/promises');
    // await fs.access(mcpServerPath); // will throw if not found
    
    const client = new McpClientService(mcpServerPath);
    await client.connect();
    
    const tools = await client.getTools();
    console.log(`📦 Registering ${tools.length} MCP tools:`);
    
    tools.forEach(tool => {
      registerTool(tool);
      console.log(`   • ${tool.name} (MCP)`);
    });
    
  } catch (error) {
    console.log('⚠️ MCP Initialization skipped or failed (non-critical for now):', error);
  }
}

// Re-export registry functions
export * from './registry.js';

// Export individual tools for direct access
export { calculatorTool } from './calculator.js';
export { timeTool } from './time.js';
export { webSearchTool } from './web/search.js';
export { httpFetchTool } from './http/fetch.js';
export { webBrowseTool } from './web/browse.js';
export { summarizeTool } from './web/summarize.js';
export { weatherTool } from './weather/weather.js';
export { readFileTool } from './filesystem/read.js';
export { writeFileTool } from './filesystem/write.js';
export { listDirectoryTool } from './filesystem/list.js';
export { searchKnowledgebaseTool } from './knowledge/search.js';
export { taskDecompositionTool } from './planner/decompose.js';
export { goalValidationTool } from './planner/validate.js';
export { agentDelegationTool } from './orchestrator/delegate.js';
export { agentCoordinationTool } from './orchestrator/coordinate.js';
