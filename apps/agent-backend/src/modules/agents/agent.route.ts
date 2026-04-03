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
import { getDefaultAgent, getAgent, listAgents } from '../../modules/agents/index.js';
import type { Message } from '../../core/types/agent.js';

/**
 * Schema for chat request body
 *
 * Only 'user' and 'assistant' roles are accepted from
 * external callers. The 'system' role is reserved for server-side agent
 * prompts and must never be injectable by API clients.
 *
 * Additionally we cap content length and the total number of messages to
 * prevent abuse / oversized prompts.
 */
const chatRequestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(['user', 'assistant']),           // 'system' intentionally excluded
    content: z.string().max(10_000, 'Message content exceeds maximum length of 10,000 characters'),
  }))
  .min(1, 'At least one message is required')
  .max(50, 'Too many messages in a single request'),
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
          costInfo: response.costInfo,
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
   * POST /agents/chat/stream
   * Stream a chat response via Server-Sent Events (SSE)
   *
   * Each SSE message is one of:
   *   data: {"type":"chunk","text":"..."}      — text token
   *   data: {"type":"tool","name":"...","args":{...},"result":{...}}  — tool call
   *   data: {"type":"done"}                    — stream finished
   *   data: {"type":"error","message":"..."}   — error
   */
  fastify.post('/agents/chat/stream', async (request: FastifyRequest, reply: FastifyReply) => {
    let body: ChatRequest;
    try {
      body = chatRequestSchema.parse(request.body);
    } catch (error) {
      return reply.status(400).send({ success: false, error: 'Invalid request format' });
    }

    const agent = getDefaultAgent();

    // Set SSE headers
    reply.raw.setHeader('Content-Type', 'text/event-stream');
    reply.raw.setHeader('Cache-Control', 'no-cache');
    reply.raw.setHeader('Connection', 'keep-alive');
    reply.raw.setHeader('Access-Control-Allow-Origin', '*');
    reply.raw.flushHeaders?.();

    const send = (payload: object) => {
      reply.raw.write(`data: ${JSON.stringify(payload)}\n\n`);
    };

    const lastMessage = body.messages[body.messages.length - 1];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📨 [STREAM] Incoming: "${lastMessage?.content}"`);

    try {
      const onToolCall = (toolName: string, args: unknown, result: unknown) => {
        send({ type: 'tool', name: toolName, args, result });
      };

      const stream = agent.chatStream(
        { messages: body.messages as import('../../core/types/agent.js').Message[] },
        undefined,
        onToolCall,
        { raw: true }
      );

      for await (const chunk of stream) {
        send({ type: 'chunk', text: chunk });
      }

      send({ type: 'done' });
      console.log(`✅ [STREAM] Complete`);
    } catch (err) {
      console.error('❌ [STREAM] Error:', err);
      send({ type: 'error', message: err instanceof Error ? err.message : 'Unknown error' });
    } finally {
      reply.raw.end();
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
          costInfo: response.costInfo,
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


