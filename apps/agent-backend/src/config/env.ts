/**
 * ==========================================
 * Environment Configuration
 * ==========================================
 * 
 * This module handles loading and validating environment variables.
 * We use Zod for type-safe validation - if any required variable
 * is missing, the app will fail fast with a clear error message.
 * 
 * LEARNING NOTE:
 * Always validate environment variables at startup! This prevents
 * mysterious runtime errors when a variable is undefined.
 */

import { z } from 'zod';
import dotenv from 'dotenv';

// Load .env file into process.env
dotenv.config();

/**
 * Schema for our environment variables
 * 
 * Zod allows us to:
 * 1. Define what variables we expect
 * 2. Validate their types
 * 3. Provide defaults
 * 4. Transform values (like string to number)
 */
const envSchema = z.object({
  // OpenAI Configuration
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  
  // Server Configuration
  PORT: z.string().transform(Number).default('3001'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Supabase Configuration
  SUPABASE_URL: z.string().url('Must be a valid URL'),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase Service Role Key is required'),
});

/**
 * Parse and validate environment variables
 * This will throw an error if validation fails
 */
function validateEnv() {
  const result = envSchema.safeParse(process.env);
  
  if (!result.success) {
    console.error('❌ Invalid environment variables:');
    console.error(result.error.format());
    process.exit(1);
  }
  
  return result.data;
}

// Export validated environment variables
export const env = validateEnv();

// Type for our environment (useful for type hints elsewhere)
export type Env = z.infer<typeof envSchema>;

