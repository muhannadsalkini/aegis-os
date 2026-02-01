/**
 * ==========================================
 * Agent Coordination Tool - Phase 4
 * ==========================================
 * 
 * LEARNING NOTE: Parallel Agent Execution
 * 
 * Sometimes you need multiple agents working in parallel.
 * This tool coordinates multiple agents simultaneously and
 * aggregates their results.
 * 
 * Example use case:
 * - Research multiple topics at once
 * - Get multiple perspectives on planning
 * - Parallel information gathering
 */

import type { Tool } from '../../types/tool.js';
import type { AgentContext } from '../../types/agent.js';
import { getAgent } from '../../agents/index.js';

interface CoordinationTask {
  agentId: string;
  task: string;
}

interface CoordinationResult {
  agentId: string;
  success: boolean;
  response?: string;
  error?: string;
  duration: number;
}

/**
 * Agent Coordination Tool
 */
export const agentCoordinationTool: Tool = {
  name: 'coordinate_agents',
  description: 'Coordinate multiple agents to work on tasks in parallel. Useful when you need multiple specialized agents to work simultaneously. Returns aggregated results from all agents.',
  
  parameters: {
    type: 'object',
    properties: {
      tasks: {
        type: 'array',
        description: 'Array of tasks to delegate',
        items: {
          type: 'object',
          description: 'A coordination task for a specific agent',
          properties: {
            agentId: {
              type: 'string',
              description: 'Agent ID to delegate to'
            },
            task: {
              type: 'string',
              description: 'Task for this agent'
            }
          },
          required: ['agentId', 'task']
        }
      },
      timeout: {
        type: 'number',
        description: 'Optional: Timeout in milliseconds for all agents (default: 60000)'
      }
    },
    required: ['tasks']
  },
  
  async execute(args: Record<string, unknown>) {
    const { 
      tasks,
      timeout = 60000 
    } = args as { 
      tasks: CoordinationTask[];
      timeout?: number;
    };
    
    try {
      console.log(`⚡ Coordinating ${tasks.length} agent(s) in parallel`);
      
      // Execute all tasks in parallel
      const promises = tasks.map(async ({ agentId, task }) => {
        const startTime = Date.now();
        
        try {
          const agent = getAgent(agentId);
          if (!agent) {
            return {
              agentId,
              success: false,
              error: `Agent "${agentId}" not found`,
              duration: Date.now() - startTime
            };
          }
          
          const agentContext: AgentContext = {
            messages: [
              {
                role: 'user',
                content: task
              }
            ],
            metadata: {
              coordinatedExecution: true,
              coordinationTime: new Date().toISOString()
            }
          };
          
          const response = await agent.chat(agentContext);
          
          return {
            agentId,
            success: true,
            response: response.content,
            duration: Date.now() - startTime
          };
          
        } catch (error) {
          return {
            agentId,
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
            duration: Date.now() - startTime
          };
        }
      });
      
      // Wait for all with timeout
      const timeoutPromise = new Promise<CoordinationResult[]>((_, reject) => {
        setTimeout(() => reject(new Error('Coordination timeout')), timeout);
      });
      
      const results = await Promise.race([
        Promise.all(promises),
        timeoutPromise
      ]);
      
      const successCount = results.filter(r => r.success).length;
      const totalDuration = Math.max(...results.map(r => r.duration));
      
      console.log(`✅ Coordination complete: ${successCount}/${results.length} successful in ${totalDuration}ms`);
      
      return {
        success: true,
        result: {
          results,
          summary: {
            total: results.length,
            successful: successCount,
            failed: results.length - successCount,
            totalDuration
          }
        }
      };
      
    } catch (error) {
      console.error('Coordination error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
};
