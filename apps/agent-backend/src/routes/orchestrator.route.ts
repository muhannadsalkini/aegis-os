/**
 * ==========================================
 * Orchestrator API Route - Phase 4
 * ==========================================
 * 
 * This route provides a high-level interface to the orchestrator agent.
 * It accepts complex tasks and lets the orchestrator coordinate
 * multiple specialized agents to complete them.
 */

import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getAgent } from '../agents/index.js';

const OrchestratorRequestSchema = z.object({
  task: z.string().min(1, 'Task description is required'),
  context: z.string().optional(),
});

/**
 * Register orchestrator routes
 */
export async function registerOrchestratorRoutes(fastify: FastifyInstance) {
  /**
   * POST /api/orchestrator
   * Execute a complex task using the orchestrator agent
   */
  fastify.post('/api/orchestrator', async (request, reply) => {
    try {
      // Validate request body
      const body = OrchestratorRequestSchema.parse(request.body);
      
      // Get the orchestrator agent
      const orchestrator = getAgent('aegis-orchestrator');
      if (!orchestrator) {
        return reply.code(500).send({
          success: false,
          error: 'Orchestrator agent not available'
        });
      }
      
      // Build the user message
      const userMessage = body.context 
        ? `${body.task}\n\nContext: ${body.context}`
        : body.task;
      
      fastify.log.info({ task: body.task }, 'Orchestrator processing task');
      
      // Execute with orchestrator
      const response = await orchestrator.chat({
        messages: [
          {
            role: 'user',
            content: userMessage
          }
        ],
        metadata: {
          source: 'api',
          timestamp: new Date().toISOString()
        }
      });
      
      return reply.send({
        success: true,
        result: {
          response: response.content,
          delegations: response.toolCalls?.filter(tc => 
            tc.toolName === 'delegate_to_agent' || tc.toolName === 'coordinate_agents'
          ),
          usage: response.usage
        }
      });
      
    } catch (error) {
      fastify.log.error(error, 'Orchestrator error');
      
      if (error instanceof z.ZodError) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid request',
          details: error.errors
        });
      }
      
      return reply.code(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Internal server error'
      });
    }
  });
  
  /**
   * GET /api/orchestrator/agents
   * List all available specialized agents
   */
  fastify.get('/api/orchestrator/agents', async (request, reply) => {
    const agents = [
      {
        id: 'aegis-researcher',
        name: 'Researcher',
        description: 'Specialized in web research, browsing, and information gathering',
        capabilities: ['web_search', 'web_browse', 'summarize']
      },
      {
        id: 'aegis-planner',
        name: 'Planner',
        description: 'Specialized in goal decomposition, planning, and feasibility analysis',
        capabilities: ['decompose_task', 'validate_goal']
      },
      {
        id: 'aegis-orchestrator',
        name: 'Orchestrator',
        description: 'Coordinates multiple agents to handle complex tasks',
        capabilities: ['delegate_to_agent', 'coordinate_agents']
      }
    ];
    
    return reply.send({
      success: true,
      agents
    });
  });
}
