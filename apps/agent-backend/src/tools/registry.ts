/**
 * ==========================================
 * Tool Registry (Core)
 * ==========================================
 * 
 * Separated from index.ts to avoid circular dependencies.
 */

import type { Tool } from '../types/tool.js';

/**
 * Map of all registered tools
 * Key: tool name, Value: tool definition
 */
const toolRegistry = new Map<string, Tool>();

/**
 * Register a tool in the registry
 */
export function registerTool(tool: Tool): void {
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
