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
import { calculatorTool } from './calculator.js';
import { timeTool } from './time.js';

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
  console.log(`🔧 Registered tool: ${tool.name}`);
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
  
  const result = await tool.execute(args);
  
  console.log(`   Result: ${JSON.stringify(result)}\n`);
  
  return result;
}

// ==========================================
// Register all tools
// ==========================================

// Phase 1 tools
registerTool(calculatorTool);
registerTool(timeTool);

// Export individual tools for direct access if needed
export { calculatorTool } from './calculator.js';
export { timeTool } from './time.js';

console.log(`\n✅ Tool Registry initialized with ${toolRegistry.size} tools\n`);


