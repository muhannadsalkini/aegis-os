/**
 * ==========================================
 * JWT Authentication Middleware
 * ==========================================
 *
 * Validates Supabase JWTs on every request.
 * Uses the `jose` library with Supabase's JWKS (JSON Web Key Set)
 * endpoint for public-key based verification (ES256).
 *
 * How it works:
 * 1. Extract `Authorization: Bearer <jwt>` from the request header
 * 2. Verify the JWT signature using Supabase's public JWKS keys
 * 3. Check that the token hasn't expired
 * 4. Attach the user payload to the request for downstream use
 * 5. Return 401 for invalid / missing tokens
 */

import { jwtVerify, createRemoteJWKSet, type JWTPayload } from 'jose';
import type { FastifyRequest, FastifyReply } from 'fastify';
import { env } from '../config/env.js';

/**
 * Extended JWT payload from Supabase
 */
export interface SupabaseJWTPayload extends JWTPayload {
  sub: string;        // User ID
  email?: string;
  role?: string;       // e.g. 'authenticated'
  aud?: string;
}

/**
 * Augment Fastify's request type to include `user`
 */
declare module 'fastify' {
  interface FastifyRequest {
    user?: SupabaseJWTPayload;
  }
}

/**
 * JWKS (JSON Web Key Set) for verifying Supabase ES256 JWTs.
 * Fetches public keys from Supabase's well-known endpoint.
 * Keys are cached automatically by `jose`.
 */
const JWKS = createRemoteJWKSet(
  new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
);

/**
 * Routes that do NOT require authentication via Bearer JWT.
 * WebSocket routes handle their own auth via the ticket mechanism.
 */
const PUBLIC_ROUTES = ['/health', '/'];

/**
 * Route prefixes that are exempt from the global auth check.
 * These routes implement their own auth (e.g. ticket-based WS auth).
 */
const PUBLIC_PREFIXES = ['/voice/ws'];

/**
 * Authentication preHandler hook.
 * Register this globally on the Fastify instance.
 */
export async function requireAuth(
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<void> {
  // Strip query string for matching
  const pathname = request.url.split('?')[0] ?? request.url;

  // Skip auth for exact public routes
  if (PUBLIC_ROUTES.includes(pathname)) {
    return;
  }

  // Skip auth for routes that handle their own authentication (e.g. WebSocket with tickets)
  if (PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return;
  }

  // Extract the Bearer token
  const authHeader = request.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error(`[AUTH] 401 — No Bearer token. URL: ${request.url}, Auth header: "${authHeader ?? '(none)'}"`);
    return reply.status(401).send({
      success: false,
      error: 'Missing or invalid Authorization header',
    });
  }

  const token = authHeader.slice(7); // Remove "Bearer "

  console.log(`[AUTH] Verifying token for URL: ${request.url}`);

  try {
    const { payload } = await jwtVerify(token, JWKS);

    // Attach user info to the request
    request.user = payload as SupabaseJWTPayload;
  } catch (err) {
    const message =
      err instanceof Error && err.message.includes('expired')
        ? 'Token expired'
        : 'Invalid token';

    console.error(`[AUTH] 401 — ${message}. URL: ${request.url}, Error: ${err instanceof Error ? err.message : err}`);
    return reply.status(401).send({
      success: false,
      error: message,
    });
  }
}

/**
 * Verify a JWT token string and return the payload.
 * Useful for WebSocket authentication where we can't use the preHandler.
 */
export async function verifyToken(
  token: string,
): Promise<SupabaseJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWKS);
    return payload as SupabaseJWTPayload;
  } catch {
    return null;
  }
}
