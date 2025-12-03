/**
 * ==========================================
 * Agent Registry
 * ==========================================
 * 
 * LEARNING NOTE: Agent Management
 * 
 * Just like we have a tool registry, we have an agent registry.
 * This allows us to:
 * 1. Create pre-configured agents
 * 2. Look them up by ID
 * 3. List available agents
 * 4. Create new agents dynamically
 * 
 * In a full system, agents would be stored in a database.
 * For now, we keep them in memory.
 */

import type { AgentConfig } from '../types/agent.js';
import { BaseAgent } from './base-agent.js';
import { getAllTools } from '../tools/index.js';

/**
 * Map of registered agents
 */
const agentRegistry = new Map<string, BaseAgent>();

/**
 * Create and register a default conversational agent
 * 
 * This is our "starter" agent for Phase 1.
 * It has access to all tools and a helpful personality.
 */
function createDefaultAgent(): BaseAgent {
  const config: AgentConfig = {
    id: 'aegis-default',
    name: 'Aegis Assistant',
    type: 'conversational',
    systemPrompt: `You are Aegis, a helpful AI assistant with access to tools.

## Your Capabilities
You can use the following tools when needed:
- **calculator**: For any mathematical calculations. ALWAYS use this for math - never try to calculate in your head.
- **get_current_time**: To get the current date and time.

## Guidelines
1. Be helpful, clear, and concise
2. When you use a tool, briefly explain what you're doing
3. If a calculation is needed, always use the calculator tool
4. If asked about the time or date, always use the time tool
5. Be friendly but professional

## Response Style
- Use markdown formatting when helpful
- For calculations, show your work (the tool call and result)
- If a tool fails, explain the error to the user`,
    
    // Give this agent access to all available tools
    tools: getAllTools(),
    
    // Balanced creativity
    temperature: 0.7,
  };
  
  return new BaseAgent(config);
}

/**
 * Get an agent by ID
 */
export function getAgent(id: string): BaseAgent | undefined {
  return agentRegistry.get(id);
}

/**
 * Get or create the default agent
 */
export function getDefaultAgent(): BaseAgent {
  let agent = agentRegistry.get('aegis-default');
  
  if (!agent) {
    agent = createDefaultAgent();
    agentRegistry.set('aegis-default', agent);
  }
  
  return agent;
}

/**
 * List all registered agents
 */
export function listAgents(): { id: string; name: string; type: string }[] {
  return Array.from(agentRegistry.values()).map(agent => {
    const config = agent.getConfig();
    return {
      id: config.id,
      name: config.name,
      type: config.type,
    };
  });
}

/**
 * Create a custom agent
 */
export function createAgent(config: AgentConfig): BaseAgent {
  const agent = new BaseAgent(config);
  agentRegistry.set(config.id, agent);
  return agent;
}

// Initialize the default agent
getDefaultAgent();

// Re-export the BaseAgent class
export { BaseAgent } from './base-agent.js';


