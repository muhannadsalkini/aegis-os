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

import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import multipart from '@fastify/multipart';
import websocket from '@fastify/websocket';
import { env } from './core/config/env.js';

if (env.NODE_ENV === 'production') {
  console.log = function () {};
  console.info = function () {};
  console.warn = function () {};
  console.debug = function () {};
}
import { requireAuth } from './core/middleware/auth.js';
import { agentRoutes } from './modules/agents/agent.route.js';
import { toolRoutes } from './modules/tools/tools.route.js';
import { knowledgeRoutes } from './modules/knowledge/knowledge.route.js';
import { registerOrchestratorRoutes } from './modules/orchestrator/orchestrator.route.js';
import { voiceRoutes } from './modules/voice/voice.route.js';

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
    } : false,
  });

  // Register CORS for frontend access
  const allowedOrigins: string[] = [
    env.WEB_APP_URL.replace(/\/$/, ''), // strip trailing slash — guaranteed by Zod
  ];
  if (env.NODE_ENV === 'development') {
    // Allow both the configured URL and the canonical Next.js dev server
    if (!allowedOrigins.includes('http://localhost:3000')) {
      allowedOrigins.push('http://localhost:3000');
    }
  }

  await fastify.register(cors, {
    origin: (incomingOrigin, callback) => {
      // Same-origin requests and server-to-server calls have no Origin header
      if (!incomingOrigin) {
        callback(null, true);
        return;
      }
      if (allowedOrigins.includes(incomingOrigin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${incomingOrigin} is not allowed by CORS`), false);
      }
    },
    credentials: true,
  });

  // Register Multipart for file uploads
  await fastify.register(multipart, {
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB
    }
  });

  // Register WebSocket support (for voice /voice/ws)
  await fastify.register(websocket);

  // Register JWT authentication middleware (validates Supabase JWT on every request)
  // Public routes (/health) are excluded inside the hook.
  fastify.addHook('preHandler', requireAuth);
  
  // Health check endpoint
  // In production: minimal response — no version or timestamp to avoid fingerprinting (L-01)
  fastify.get('/health', async () => {
    if (env.NODE_ENV === 'production') {
      return { status: 'ok' };
    }
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      version: '0.1.0',
    };
  });

  // Root endpoint
  // In production: minimal branding only — no routes, version, or internal structure (L-01)
  // In development: full route map for convenience
  fastify.get('/', async () => {
    if (env.NODE_ENV === 'production') {
      return { name: 'Aegis OS API' };
    }
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
  await fastify.register(voiceRoutes);

  return fastify;
}

/**
 * Bootstrap the server (only if run directly)
 */
async function bootstrap() {
  try {
    // Initialize MCP Tools
    await import('./modules/tools/index.js').then(m => m.initializeMcpTools());

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
  // Guard against uncaught errors (e.g. Deepgram internal WebSocket timeouts) crashing the process
  process.on('uncaughtException', (err) => {
    console.error('⚠️  Uncaught Exception (server kept alive):', err.message);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('⚠️  Unhandled Rejection (server kept alive):', reason);
  });

  bootstrap();
}



