/**
 * ==========================================
 * 🚀 Aegis OS - Agent Backend Server
 * ==========================================
 * 
 * This is the main entry point for the agent backend.
 * It sets up:
 * 1. Fastify server with CORS
 * 2. All routes (agents, tools)
 * 3. Health check endpoint
 * 
 * LEARNING NOTE: Why Fastify?
 * 
 * Fastify is like Express but:
 * - Faster (up to 2x throughput)
 * - Built-in TypeScript support
 * - Schema-based validation
 * - Better plugin system
 * 
 * If you know Express, Fastify will feel familiar!
 */

import Fastify, { FastifyInstance, FastifyReply, FastifyRequest } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import { env } from './config/env.js';
import { agentRoutes } from './routes/agent.route.js';
import { toolRoutes } from './routes/tools.route.js';
import { knowledgeRoutes } from './routes/knowledge.route.js';
import { registerOrchestratorRoutes } from './routes/orchestrator.route.js';

/**
 * Build the Fastify app instance
 */
export async function buildApp(): Promise<FastifyInstance> {
  // Create the Fastify instance
  const fastify = Fastify({
    logger: env.NODE_ENV === 'development' ? {
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true,
        },
      },
    } : true,
  });

  // Register CORS for frontend access
  await fastify.register(cors, {
    origin: (process.env.WEB_APP_URL || '').replace(/\/$/, '') || true, // Use env var (without trailing slash) or allow all in dev
    credentials: true,
  });

  // Register Multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    }
  });
  
  // Health check endpoint
  fastify.get('/health', async () => {
    return { 
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
  });

  fastify.post('/test', async (request: FastifyRequest, reply: FastifyReply) => {
    console.log('req: ', request.body);
    return reply.send({
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    });
  });
  
  // Root endpoint with info
  fastify.get('/', async () => {
    return {
      name: 'Aegis OS - Agent Backend',
      version: '0.1.0',
      phase: 'Phase 4: Agent Types & Multi-Agent Systems',
      endpoints: {
        health: 'GET /health',
        agents: {
          list: 'GET /agents',
          chat: 'POST /agents/chat',
          chatWithId: 'POST /agents/:id/chat',
          details: 'GET /agents/:id',
        },
        tools: {
          list: 'GET /tools',
          details: 'GET /tools/:name',
          test: 'POST /tools/:name/test',
        },
        orchestrator: {
          execute: 'POST /api/orchestrator',
          listAgents: 'GET /api/orchestrator/agents',
        },
      },
      documentation: 'See docs/phase-4-agent-types/ for learning notes',
    };
  });
  
  // Register route handlers
  await fastify.register(agentRoutes);
  await fastify.register(toolRoutes);
  await fastify.register(knowledgeRoutes);
  await fastify.register(registerOrchestratorRoutes);

  return fastify;
}

/**
 * Bootstrap the server (only if run directly)
 */
async function bootstrap() {
  try {
    // Initialize MCP Tools
    await import('./tools/index.js').then(m => m.initializeMcpTools());

    const fastify = await buildApp();
    
    // Start the server
    await fastify.listen({ port: env.PORT, host: '0.0.0.0' });
    
    console.log(`
╔═══════════════════════════════════════════════════════════════╗
║                                                               ║
║   🛡️  AEGIS OS - Agent Backend                                ║
║                                                               ║
║   Server running at: http://localhost:${env.PORT}                  ║
║   Environment: ${env.NODE_ENV.padEnd(11)}                              ║
║   Model: ${env.OPENAI_MODEL.padEnd(17)}                              ║
║                                                               ║
║   🕸️  Phase 4: Agent Types & Multi-Agent Systems             ║
║      • Researcher Agent (ReAct pattern)                       ║
║      • Planner Agent (Planning-first)                         ║
║      • Orchestrator Agent (Delegation)                        ║
║                                                               ║
║   🧪 Test the Agent Zoo:                                      ║
║      curl -X POST http://localhost:${env.PORT}/api/orchestrator \\\\ ║
║        -H "Content-Type: application/json" \\\\                 ║
║        -d '{"task":"Research ReAct architecture and           ║
║             create a plan to implement it"}'                  ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
    `);

    // Handle graceful shutdown
    const signals = ['SIGTERM', 'SIGINT'];
    signals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n👋 Shutting down gracefully... (${signal})`);
        await fastify.close();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

// Only run bootstrap if this file is the entry point
// In ESM, import.meta.url is the current file URL
// process.argv[1] is the executed file path
// We can check if the current file is being executed
import { pathToFileURL } from 'url';

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  bootstrap();
}



