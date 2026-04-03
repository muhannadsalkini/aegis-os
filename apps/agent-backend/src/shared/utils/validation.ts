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
import dns from 'dns/promises';

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

// ─── Private-IP helpers ────────────────────────────────────────────────────

/**
 * Return true if the given IP address (v4 or v6) is private / internal.
 *
 * Also handles IPv6-mapped IPv4 addresses (e.g. "::ffff:127.0.0.1").
 */
function isPrivateIp(ip: string): boolean {
  // Unwrap IPv6-mapped IPv4 (::ffff:x.x.x.x → x.x.x.x)
  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
  const ipv4 = mapped?.[1] ?? ip;

  // IPv4 private / special-use ranges (RFC 1918, RFC 5735, etc.)
  const ipv4Ranges: RegExp[] = [
    /^0\./,                                              // This network (0.0.0.0/8)
    /^10\./,                                             // Private class A (10.0.0.0/8)
    /^127\./,                                            // Loopback (127.0.0.0/8)
    /^169\.254\./,                                       // Link-local / cloud metadata
    /^172\.(1[6-9]|2\d|3[01])\./,                       // Private class B (172.16–31.x.x)
    /^192\.0\.0\./,                                      // IETF Protocol Assignments
    /^192\.168\./,                                       // Private class C
    /^198\.1[89]\./,                                     // Benchmarking (198.18–19.x.x)
    /^198\.51\.100\./,                                   // Documentation TEST-NET-2
    /^203\.0\.113\./,                                    // Documentation TEST-NET-3
    /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,        // CGNAT (100.64.0.0/10)
    /^255\.255\.255\.255$/,                              // Broadcast
  ];

  for (const range of ipv4Ranges) {
    if (range.test(ipv4)) return true;
  }

  // IPv6 special ranges (skip when we already unwrapped a mapped IPv4)
  if (!mapped) {
    const ipv6Ranges: RegExp[] = [
      /^::1$/,       // Loopback
      /^::$/,        // Unspecified
      /^fc[0-9a-f]{2}:/i,  // Unique Local (fc00::/7)
      /^fd[0-9a-f]{2}:/i,  // Unique Local
      /^fe80:/i,     // Link-Local (fe80::/10)
      /^ff/i,        // Multicast
    ];
    for (const range of ipv6Ranges) {
      if (range.test(ip)) return true;
    }
  }

  return false;
}

/**
 * Detect SSRF bypass attempts that use non-standard IP notations.
 *
 * Covers:
 *  - Pure decimal integer  (e.g. 2130706433  → 127.0.0.1)
 *  - Hex representation    (e.g. 0x7f000001  → 127.0.0.1)
 *  - Octal / mixed octets  (e.g. 0177.0.0.1  → 127.0.0.1)
 */
function hasEncodedPrivateIp(hostname: string): boolean {
  const toIpFromInt = (n: number): string =>
    [(n >>> 24) & 0xff, (n >>> 16) & 0xff, (n >>> 8) & 0xff, n & 0xff].join('.');

  // Pure decimal (e.g. 2130706433)
  if (/^\d+$/.test(hostname)) {
    const n = parseInt(hostname, 10);
    if (!isNaN(n) && n >= 0 && n <= 0xffffffff) {
      if (isPrivateIp(toIpFromInt(n))) return true;
    }
  }

  // Hex (e.g. 0x7f000001)
  if (/^0x[0-9a-f]+$/i.test(hostname)) {
    const n = parseInt(hostname, 16);
    if (!isNaN(n) && n >= 0 && n <= 0xffffffff) {
      if (isPrivateIp(toIpFromInt(n))) return true;
    }
  }

  // Dotted notation with octal or hex octets (e.g. 0177.0.0.1 or 0x7f.1.1.1)
  if (hostname.includes('.') && /^[\da-fx.]+$/i.test(hostname)) {
    const parts = hostname.split('.');
    if (parts.length === 4) {
      const octets = parts.map(p => {
        if (/^0x/i.test(p)) return parseInt(p, 16);
        if (p.length > 1 && p.startsWith('0')) return parseInt(p, 8);
        return parseInt(p, 10);
      });
      if (octets.every(n => !isNaN(n) && n >= 0 && n <= 255)) {
        if (isPrivateIp(octets.join('.'))) return true;
      }
    }
  }

  return false;
}

/**
 * Validate a URL — async so DNS resolution can be performed.
 *
 * Defence layers (in order):
 * 1. Protocol allowlist (http / https only)
 * 2. Blocked hostname strings (localhost, 0.0.0.0, …)
 * 3. Encoded private-IP detection (decimal / hex / octal)
 * 4. DNS resolution → validate every resolved IP against private ranges
 *
 * This defeats:
 *  - IPv6-mapped IPv4 (::ffff:127.0.0.1)
 *  - Decimal/hex/octal encoded IPs
 *  - DNS rebinding attacks
 *  - Cloud-metadata endpoint (169.254.169.254)
 */
export async function validateUrl(inputUrl: string): Promise<ValidationResult> {
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

  const hostname = url.hostname.toLowerCase();

  // Layer 2: block well-known internal host strings immediately
  const blockedHostnames = [
    'localhost',
    '0.0.0.0',
    'broadcasthost',
    'ip6-localhost',
    'ip6-loopback',
    'ip6-allnodes',
    'ip6-allrouters',
  ];
  if (blockedHostnames.includes(hostname)) {
    return { valid: false, error: 'Internal URLs are not allowed' };
  }

  // Layer 3: encoded private-IP bypass detection (no DNS needed)
  if (hasEncodedPrivateIp(hostname)) {
    return { valid: false, error: 'Internal URLs are not allowed' };
  }

  // Layer 4: DNS resolution — catch rebinding attacks and IPv6-mapped addresses
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      return { valid: false, error: 'Could not resolve hostname' };
    }
    for (const { address } of addresses) {
      if (isPrivateIp(address)) {
        return { valid: false, error: 'Internal URLs are not allowed' };
      }
    }
  } catch {
    // Unresolvable hostnames are treated as invalid to fail safe
    return { valid: false, error: 'Could not resolve hostname' };
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

