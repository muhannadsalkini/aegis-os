/**
 * ==========================================
 * HTTP Utilities
 * ==========================================
 * 
 * LEARNING NOTE: Safe HTTP Requests
 * 
 * When making HTTP requests from tools, we need:
 * 1. Timeouts - Don't let requests hang forever
 * 2. Error handling - Network can fail in many ways
 * 3. Response limits - Don't download gigabytes of data
 * 4. User agent - Some APIs require identification
 */

/**
 * Options for HTTP requests
 */
export interface HttpOptions {
  timeout?: number;
  maxSize?: number;
  headers?: Record<string, string>;
}

/**
 * Result of an HTTP request
 */
export interface HttpResult {
  success: boolean;
  status?: number;
  data?: string;
  error?: string;
}

/**
 * Default timeout (10 seconds)
 */
const DEFAULT_TIMEOUT = 10000;

/**
 * Default max response size (1MB)
 */
const DEFAULT_MAX_SIZE = 1024 * 1024;

/**
 * User agent for requests
 */
const USER_AGENT = 'AegisOS/1.0 (AI Agent)';

/**
 * Make a safe HTTP GET request
 */
export async function httpGet(url: string, options: HttpOptions = {}): Promise<HttpResult> {
  const { timeout = DEFAULT_TIMEOUT, maxSize = DEFAULT_MAX_SIZE, headers = {} } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        ...headers,
      },
    });
    
    // Check content length before downloading
    const contentLength = response.headers.get('content-length');
    if (contentLength && parseInt(contentLength) > maxSize) {
      return {
        success: false,
        error: `Response too large: ${contentLength} bytes (max: ${maxSize})`,
      };
    }
    
    // Read response with size limit
    const reader = response.body?.getReader();
    if (!reader) {
      return { success: false, error: 'No response body' };
    }
    
    const chunks: Uint8Array[] = [];
    let totalSize = 0;
    
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      totalSize += value.length;
      if (totalSize > maxSize) {
        reader.cancel();
        return { success: false, error: `Response exceeded max size of ${maxSize} bytes` };
      }
      
      chunks.push(value);
    }
    
    // Combine chunks and decode
    const combined = new Uint8Array(totalSize);
    let offset = 0;
    for (const chunk of chunks) {
      combined.set(chunk, offset);
      offset += chunk.length;
    }
    
    const data = new TextDecoder().decode(combined);
    
    return {
      success: response.ok,
      status: response.status,
      data,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: `Request timed out after ${timeout}ms` };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * Make a safe HTTP POST request
 */
export async function httpPost(
  url: string,
  body: unknown,
  options: HttpOptions = {}
): Promise<HttpResult> {
  const { timeout = DEFAULT_TIMEOUT, maxSize = DEFAULT_MAX_SIZE, headers = {} } = options;
  
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      signal: controller.signal,
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.text();
    
    if (data.length > maxSize) {
      return { success: false, error: `Response exceeded max size of ${maxSize} bytes` };
    }
    
    return {
      success: response.ok,
      status: response.status,
      data,
      error: response.ok ? undefined : `HTTP ${response.status}: ${response.statusText}`,
    };
  } catch (error) {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return { success: false, error: `Request timed out after ${timeout}ms` };
      }
      return { success: false, error: error.message };
    }
    return { success: false, error: 'Unknown error occurred' };
  } finally {
    clearTimeout(timeoutId);
  }
}

