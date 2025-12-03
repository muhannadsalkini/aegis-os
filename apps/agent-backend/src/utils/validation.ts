/**
 * ==========================================
 * Input Validation Utilities
 * ==========================================
 * 
 * LEARNING NOTE: Why Validate?
 * 
 * When the AI calls a tool, it provides arguments as JSON.
 * While OpenAI usually generates valid JSON, we should:
 * 1. Never trust input blindly
 * 2. Sanitize paths and URLs
 * 3. Check for malicious patterns
 * 4. Provide clear error messages
 * 
 * This protects your system and gives better error feedback.
 */

import path from 'path';

/**
 * Result of a validation check
 */
export interface ValidationResult {
  valid: boolean;
  error?: string;
  sanitized?: string;
}

/**
 * Validate and sanitize a file path
 * 
 * Prevents:
 * - Path traversal attacks (../../etc/passwd)
 * - Access to sensitive directories
 * - Absolute paths outside workspace
 */
export function validateFilePath(
  inputPath: string,
  allowedBase: string = './workspace'
): ValidationResult {
  if (!inputPath || typeof inputPath !== 'string') {
    return { valid: false, error: 'Path must be a non-empty string' };
  }
  
  // Normalize the path to remove .. and .
  const normalized = path.normalize(inputPath);
  
  // Check for path traversal attempts
  if (normalized.includes('..')) {
    return { valid: false, error: 'Path traversal not allowed' };
  }
  
  // Resolve to absolute path
  const resolved = path.resolve(allowedBase, normalized);
  const baseResolved = path.resolve(allowedBase);
  
  // Ensure the path stays within the allowed directory
  if (!resolved.startsWith(baseResolved)) {
    return { valid: false, error: 'Path must be within allowed directory' };
  }
  
  // Block sensitive files
  const sensitivePatterns = [
    /\.env/i,
    /\.git/i,
    /node_modules/i,
    /\.ssh/i,
    /\.aws/i,
    /password/i,
    /secret/i,
    /credential/i,
  ];
  
  for (const pattern of sensitivePatterns) {
    if (pattern.test(resolved)) {
      return { valid: false, error: 'Access to sensitive files not allowed' };
    }
  }
  
  return { valid: true, sanitized: resolved };
}

/**
 * Validate a URL
 * 
 * Ensures:
 * - Valid URL format
 * - Safe protocols (http/https only)
 * - Not targeting localhost/internal IPs
 */
export function validateUrl(inputUrl: string): ValidationResult {
  if (!inputUrl || typeof inputUrl !== 'string') {
    return { valid: false, error: 'URL must be a non-empty string' };
  }
  
  let url: URL;
  try {
    url = new URL(inputUrl);
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }
  
  // Only allow http and https
  if (!['http:', 'https:'].includes(url.protocol)) {
    return { valid: false, error: 'Only HTTP and HTTPS protocols are allowed' };
  }
  
  // Block localhost and internal IPs
  const hostname = url.hostname.toLowerCase();
  const blockedPatterns = [
    'localhost',
    '127.0.0.1',
    '0.0.0.0',
    '::1',
    '10.',
    '172.16.',
    '172.17.',
    '172.18.',
    '172.19.',
    '172.20.',
    '172.21.',
    '172.22.',
    '172.23.',
    '172.24.',
    '172.25.',
    '172.26.',
    '172.27.',
    '172.28.',
    '172.29.',
    '172.30.',
    '172.31.',
    '192.168.',
    '169.254.',
  ];
  
  for (const pattern of blockedPatterns) {
    if (hostname === pattern || hostname.startsWith(pattern)) {
      return { valid: false, error: 'Internal URLs are not allowed' };
    }
  }
  
  return { valid: true, sanitized: url.toString() };
}

/**
 * Validate a search query
 * 
 * Sanitizes and limits query length
 */
export function validateSearchQuery(query: string): ValidationResult {
  if (!query || typeof query !== 'string') {
    return { valid: false, error: 'Query must be a non-empty string' };
  }
  
  // Trim and limit length
  const sanitized = query.trim().slice(0, 500);
  
  if (sanitized.length === 0) {
    return { valid: false, error: 'Query cannot be empty' };
  }
  
  return { valid: true, sanitized };
}

/**
 * Validate city name for weather queries
 */
export function validateCityName(city: string): ValidationResult {
  if (!city || typeof city !== 'string') {
    return { valid: false, error: 'City must be a non-empty string' };
  }
  
  // Remove special characters, keep letters, spaces, and common punctuation
  const sanitized = city.trim().replace(/[^a-zA-Z\s\-',]/g, '').slice(0, 100);
  
  if (sanitized.length < 2) {
    return { valid: false, error: 'City name too short' };
  }
  
  return { valid: true, sanitized };
}

