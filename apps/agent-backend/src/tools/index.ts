/**
 * ==========================================
 * Tool Registry
 * ==========================================
 * 
 * LEARNING NOTE: The Tool Registry Pattern
 * 
 * Instead of scattering tools across the codebase, we centralize
 * them in a registry. This gives us:
 * 
 * 1. Single source of truth for all available tools
 * 2. Easy lookup by name when the AI calls a tool
 * 3. Ability to enable/disable tools per agent
 * 4. Clean separation between tool definition and usage
 * 
 * When the AI says "call the calculator tool", we look it up here.
 */

import type { Tool } from '../types/tool.js';

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

/**
 * Map of all registered tools
 * Key: tool name, Value: tool definition
 */
const toolRegistry = new Map<string, Tool>();

/**
 * Register a tool in the registry
 */
function registerTool(tool: Tool): void {
  if (toolRegistry.has(tool.name)) {
    console.warn(`⚠️ Tool "${tool.name}" is already registered. Overwriting.`);
  }
  toolRegistry.set(tool.name, tool);
}

/**
 * Get a tool by name
 */
export function getTool(name: string): Tool | undefined {
  return toolRegistry.get(name);
}

/**
 * Get all registered tools
 */
export function getAllTools(): Tool[] {
  return Array.from(toolRegistry.values());
}

/**
 * Get tools by names
 * Useful for agents that only need specific tools
 */
export function getToolsByNames(names: string[]): Tool[] {
  return names
    .map(name => toolRegistry.get(name))
    .filter((tool): tool is Tool => tool !== undefined);
}

/**
 * Get tools by category
 */
export function getToolsByCategory(
  category: 'math' | 'time' | 'web' | 'filesystem' | 'weather' | 'knowledge' | 'research' | 'planning' | 'orchestration'
): Tool[] {
  const categories: Record<string, string[]> = {
    math: ['calculator'],
    time: ['get_current_time'],
    web: ['web_search', 'http_fetch', 'web_browse'],
    filesystem: ['read_file', 'write_file', 'list_directory'],
    weather: ['get_weather'],
    knowledge: ['search_knowledgebase'],
    research: ['web_search', 'web_browse', 'summarize'],
    planning: ['decompose_task', 'validate_goal'],
    orchestration: ['delegate_to_agent', 'coordinate_agents'],
  };
  
  return getToolsByNames(categories[category] || []);
}

/**
 * Execute a tool by name
 * 
 * This is called when the AI requests a tool execution.
 * We find the tool and run its execute function.
 */
export async function executeTool(
  name: string,
  args: Record<string, unknown>
): Promise<{ success: boolean; result?: unknown; error?: string }> {
  const tool = toolRegistry.get(name);
  
  if (!tool) {
    return {
      success: false,
      error: `Tool "${name}" not found`,
    };
  }
  
  console.log(`\n🔧 Executing tool: ${name}`);
  console.log(`   Arguments: ${JSON.stringify(args)}`);
  
  const startTime = Date.now();
  const result = await tool.execute(args);
  const duration = Date.now() - startTime;
  
  console.log(`   Duration: ${duration}ms`);
  console.log(`   Success: ${result.success}`);
  
  return result;
}

// ==========================================
// Register all tools
// ==========================================

console.log('\n📦 Registering tools...');

// Phase 1 - Basic tools
registerTool(calculatorTool);
registerTool(timeTool);

// Phase 2 - Web & HTTP tools
registerTool(webSearchTool);
registerTool(httpFetchTool);
registerTool(webBrowseTool);
registerTool(summarizeTool);

// Phase 2 - Weather tool
registerTool(weatherTool);

// Phase 2 - Filesystem tools
registerTool(readFileTool);
registerTool(writeFileTool);
registerTool(listDirectoryTool);

// Phase 3 - Knowledge tool
registerTool(searchKnowledgebaseTool);

// Phase 4 - Planning tools
registerTool(taskDecompositionTool);
registerTool(goalValidationTool);

// Phase 4 - Orchestration tools
registerTool(agentDelegationTool);
registerTool(agentCoordinationTool);

console.log(`✅ Tool Registry initialized with ${toolRegistry.size} tools:`);
toolRegistry.forEach((tool, name) => {
  console.log(`   • ${name}`);
});
console.log('');

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
