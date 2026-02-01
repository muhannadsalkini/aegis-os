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
import { createResearcherAgent } from './researcher-agent.js';
import { createPlannerAgent } from './planner-agent.js';
import { createOrchestratorAgent } from './orchestrator-agent.js';

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
    systemPrompt: `You are Aegis, a powerful AI assistant with access to many tools.

## Your Tools

### 🧮 Math & Time
- **calculator**: For ANY math. ALWAYS use this - never calculate in your head.
- **get_current_time**: Get current date/time in any timezone.

### 🔍 Web & HTTP
- **web_search**: Search the internet for current information, facts, definitions.
- **http_fetch**: Fetch data from any URL (APIs, websites).

### 🌤️ Weather
- **get_weather**: Get current weather and forecast for any city.

### 📁 Filesystem (workspace only)
- **list_directory**: See what files exist in a directory.
- **read_file**: Read contents of a file.
- **write_file**: Create or update a file.

## Guidelines
1. ALWAYS use calculator for math - you cannot calculate reliably.
2. Use web_search for facts you're unsure about or current events.
3. Use get_weather when asked about weather conditions.
4. For files: first list_directory to see what exists, then read/write.
5. Be helpful, clear, and concise.
6. Briefly explain what tool you're using and why.

## Response Style
- Use markdown formatting for clarity
- Show tool results in a readable way
- If a tool fails, explain the error and suggest alternatives`,
    
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

// Initialize Phase 4 specialized agents
console.log('\n🔧 Initializing Phase 4 specialized agents...');

const researcherAgent = createResearcherAgent();
agentRegistry.set(researcherAgent.getConfig().id, researcherAgent);
console.log(`   ✅ ${researcherAgent.getConfig().name} ready`);

const plannerAgent = createPlannerAgent();
agentRegistry.set(plannerAgent.getConfig().id, plannerAgent);
console.log(`   ✅ ${plannerAgent.getConfig().name} ready`);

const orchestratorAgent = createOrchestratorAgent();
agentRegistry.set(orchestratorAgent.getConfig().id, orchestratorAgent);
console.log(`   ✅ ${orchestratorAgent.getConfig().name} ready`);

console.log(`\n🤖 Agent Zoo initialized with ${agentRegistry.size} agents\n`);

// Re-export the BaseAgent class
export { BaseAgent } from './base-agent.js';

// Export specialized agent creators
export { createResearcherAgent } from './researcher-agent.js';
export { createPlannerAgent } from './planner-agent.js';
export { createOrchestratorAgent } from './orchestrator-agent.js';


