/**
 * ==========================================
 * OpenAI Client Configuration
 * ==========================================
 * 
 * This module creates and exports the OpenAI client instance.
 * We centralize this so all parts of our app use the same client.
 * 
 * LEARNING NOTE:
 * The OpenAI SDK v4 is the latest version and supports:
 * - Function calling (tools)
 * - Streaming responses
 * - JSON mode
 * - Vision (image understanding)
 * - And much more!
 */

import OpenAI from 'openai';
import { env } from './env.js';

/**
 * Create the OpenAI client instance
 * 
 * The client handles:
 * - Authentication (using your API key)
 * - Request formatting
 * - Response parsing
 * - Error handling
 * - Retries on transient failures
 */
export const openai = new OpenAI({
  apiKey: env.OPENAI_API_KEY,
});

/**
 * Default model to use for chat completions
 * Can be overridden per-request if needed
 */
export const defaultModel = env.OPENAI_MODEL;

/**
 * LEARNING NOTE: Available Models
 * 
 * GPT-4o (gpt-4o):
 *   - Most capable model
 *   - Best for complex reasoning
 *   - Highest cost
 * 
 * GPT-4o-mini (gpt-4o-mini):
 *   - Great balance of capability and cost
 *   - Good for most tasks
 *   - Our default choice
 * 
 * GPT-3.5-turbo:
 *   - Fastest and cheapest
 *   - Good for simple tasks
 *   - May struggle with complex tool calls
 */

