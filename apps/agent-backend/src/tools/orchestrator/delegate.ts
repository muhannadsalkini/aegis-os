/**
 * ==========================================
 * Agent Delegation Tool - Phase 4
 * ==========================================
 * 
 * LEARNING NOTE: Multi-Agent Systems
 * 
 * This is where things get interesting! This tool allows one agent
 * to delegate tasks to other specialized agents.
 * 
 * Flow:
 * Orchestrator Agent → delegate tool → Researcher Agent → result
 * 
 * This creates a hierarchical multi-agent system where agents
 * collaborate to solve complex problems.
 * 
 * IMPORTANT: We track delegation chains to prevent infinite loops!
 */

import type { Tool } from '../../types/tool.js';
import type { AgentContext } from '../../types/agent.js';
import { getAgent } from '../../agents/index.js';

/**
 * Track active delegations to prevent circular delegation
 */
const activeDelegations = new Set<string>();

/**
 * Agent Delegation Tool
 */
export const agentDelegationTool: Tool = {
  name: 'delegate_to_agent',
  description: 'Delegate a task to another specialized agent. Use this when a task requires specific expertise (e.g., research, planning). Available agents: "aegis-researcher" (for research tasks), "aegis-planner" (for planning tasks). Returns the agent\'s response.',
  
  parameters: {
    type: 'object',
    properties: {
      agentId: {
        type: 'string',
        description: 'The ID of the agent to delegate to',
        enum: ['aegis-researcher', 'aegis-planner']
      },
      task: {
        type: 'string',
        description: 'The task description to give to the agent'
      },
      context: {
        type: 'string',
        description: 'Optional: Additional context for the task'
      }
    },
    required: ['agentId', 'task']
  },
  
  async execute(args: Record<string, unknown>) {
    const { 
      agentId, 
      task,
      context
    } = args as { 
      agentId: string; 
      task: string;
      context?: string;
    };
    
    try {
      console.log(`🔀 Delegating to agent: ${agentId}`);
      console.log(`   Task: ${task}`);
      
      // Create a delegation key to track this delegation
      const delegationKey = `${agentId}:${task.substring(0, 50)}`;
      
      // Check for circular delegation
      if (activeDelegations.has(delegationKey)) {
        return {
          success: false,
          error: 'Circular delegation detected. This task is already being processed by this agent.'
        };
      }
      
      // Get the target agent
      const agent = getAgent(agentId);
      if (!agent) {
        return {
          success: false,
          error: `Agent "${agentId}" not found. Available agents: aegis-researcher, aegis-planner, aegis-default`
        };
      }
      
      // Mark this delegation as active
      activeDelegations.add(delegationKey);
      
      try {
        // Build the message with context if provided
        const userMessage = context 
          ? `${task}\n\nAdditional context: ${context}`
          : task;
        
        // Create agent context
        const agentContext: AgentContext = {
          messages: [
            {
              role: 'user',
              content: userMessage
            }
          ],
          metadata: {
            delegatedFrom: 'orchestrator',
            delegationTime: new Date().toISOString()
          }
        };
        
        // Call the agent
        const response = await agent.chat(agentContext);
        
        console.log(`✅ Delegation complete. Agent responded with ${response.content.length} chars`);
        
        return {
          success: true,
          result: {
            agentId,
            task,
            response: response.content,
            toolsUsed: response.toolCalls?.map(tc => tc.toolName) || [],
            usage: response.usage
          }
        };
        
      } finally {
        // Remove from active delegations
        activeDelegations.delete(delegationKey);
      }
      
    } catch (error) {
      console.error('Delegation error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
};
