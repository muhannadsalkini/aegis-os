/**
 * ==========================================
 * Agent Routes
 * ==========================================
 * 
 * LEARNING NOTE: REST API for Agents
 * 
 * These routes expose our agents via HTTP:
 * 
 * POST /agents/chat - Send a message to the default agent
 * POST /agents/:id/chat - Send a message to a specific agent
 * GET  /agents - List all agents
 * GET  /agents/:id - Get agent details
 * 
 * In Phase 6, we'll add streaming endpoints!
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getDefaultAgent, getAgent, listAgents } from '../agents/index.js';
import type { Message } from '../types/agent.js';

/**
 * Schema for chat request body
 */
const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant', 'system']),
    content: z.string(),
  })),
});

type ChatRequest = z.infer<typeof chatRequestSchema>;

/**
 * Register agent routes
 */
export async function agentRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /agents
   * List all available agents
   */
  fastify.get('/agents', async (_request: FastifyRequest, reply: FastifyReply) => {
    const agents = listAgents();
    return reply.send({ agents });
  });
  
  /**
   * POST /agents/chat
   * Chat with the default agent
   * 
   * This is the main endpoint for Phase 1!
   * 
   * Example request:
   * {
   *   "messages": [
   *     { "role": "user", "content": "What is 25 * 48?" }
   *   ]
   * }
   */
  fastify.post('/agents/chat', async (request: FastifyRequest, reply: FastifyReply) => {
    try {
      // Validate the request body
      const body = chatRequestSchema.parse(request.body);
      
      // Get the default agent
      const agent = getDefaultAgent();
      
      // Log the incoming message
      const lastMessage = body.messages[body.messages.length - 1];
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📨 Incoming message: "${lastMessage?.content}"`);
      console.log(`${'='.repeat(60)}`);
      
      // Process the conversation
      const response = await agent.chat({
        messages: body.messages as Message[],
      });
      
      // Log the response
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📤 Response: "${response.content.substring(0, 100)}..."`);
      if (response.toolCalls) {
        console.log(`🔧 Tools used: ${response.toolCalls.map(tc => tc.toolName).join(', ')}`);
      }
      console.log(`${'='.repeat(60)}\n`);
      
      return reply.send({
        success: true,
        data: {
          content: response.content,
          toolCalls: response.toolCalls,
          usage: response.usage,
        },
      });
    } catch (error) {
      console.error('❌ Chat error:', error);
      
      if (error instanceof z.ZodError) {
        return reply.status(400).send({
          success: false,
          error: 'Invalid request format',
          details: error.errors,
        });
      }
      
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  
  /**
   * POST /agents/:id/chat
   * Chat with a specific agent
   */
  fastify.post('/agents/:id/chat', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    try {
      const { id } = request.params;
      const body = chatRequestSchema.parse(request.body);
      
      const agent = getAgent(id);
      
      if (!agent) {
        return reply.status(404).send({
          success: false,
          error: `Agent "${id}" not found`,
        });
      }
      
      const response = await agent.chat({
        messages: body.messages as Message[],
      });
      
      return reply.send({
        success: true,
        data: {
          content: response.content,
          toolCalls: response.toolCalls,
          usage: response.usage,
        },
      });
    } catch (error) {
      console.error('❌ Chat error:', error);
      
      return reply.status(500).send({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  });
  
  /**
   * GET /agents/:id
   * Get information about a specific agent
   */
  fastify.get('/agents/:id', async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
    const { id } = request.params;
    const agent = getAgent(id);
    
    if (!agent) {
      return reply.status(404).send({
        success: false,
        error: `Agent "${id}" not found`,
      });
    }
    
    const config = agent.getConfig();
    
    return reply.send({
      success: true,
      data: {
        id: config.id,
        name: config.name,
        type: config.type,
        tools: config.tools.map(t => t.name),
      },
    });
  });
}


