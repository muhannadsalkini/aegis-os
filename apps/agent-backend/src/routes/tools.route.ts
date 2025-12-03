/**
 * ==========================================
 * Tool Routes
 * ==========================================
 * 
 * LEARNING NOTE: Tool API
 * 
 * These routes let you:
 * 1. List all available tools
 * 2. Get details about a specific tool
 * 3. Test a tool directly (useful for debugging!)
 * 
 * While agents usually call tools automatically,
 * sometimes you want to test a tool manually.
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { getAllTools, getTool, executeTool } from '../tools/index.js';

/**
 * Schema for testing a tool
 */
const testToolSchema = z.object({
  args: z.record(z.unknown()),
});

/**
 * Register tool routes
 */
export async function toolRoutes(fastify: FastifyInstance) {
  
  /**
   * GET /tools
   * List all available tools
   */
  fastify.get('/tools', async (_request: FastifyRequest, reply: FastifyReply) => {
    const tools = getAllTools();
    
    return reply.send({
      success: true,
      data: tools.map(tool => ({
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      })),
    });
  });
  
  /**
   * GET /tools/:name
   * Get details about a specific tool
   */
  fastify.get('/tools/:name', async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) => {
    const { name } = request.params;
    const tool = getTool(name);
    
    if (!tool) {
      return reply.status(404).send({
        success: false,
        error: `Tool "${name}" not found`,
      });
    }
    
    return reply.send({
      success: true,
      data: {
        name: tool.name,
        description: tool.description,
        parameters: tool.parameters,
      },
    });
  });
  
  /**
   * POST /tools/:name/test
   * Test a tool directly
   * 
   * Example:
   * POST /tools/calculator/test
   * { "args": { "operation": "multiply", "a": 5, "b": 10 } }
   */
  fastify.post('/tools/:name/test', async (request: FastifyRequest<{ Params: { name: string } }>, reply: FastifyReply) => {
    const { name } = request.params;
    
    try {
      const body = testToolSchema.parse(request.body);
      
      const tool = getTool(name);
      
      if (!tool) {
        return reply.status(404).send({
          success: false,
          error: `Tool "${name}" not found`,
        });
      }
      
      console.log(`\n🧪 Testing tool: ${name}`);
      console.log(`   Args: ${JSON.stringify(body.args)}`);
      
      const result = await executeTool(name, body.args);
      
      return reply.send({
        success: true,
        data: result,
      });
    } catch (error) {
      console.error('❌ Tool test error:', error);
      
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
}


