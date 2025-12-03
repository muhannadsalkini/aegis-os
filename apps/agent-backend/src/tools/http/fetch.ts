/**
 * ==========================================
 * 🌐 HTTP Fetch Tool
 * ==========================================
 * 
 * LEARNING NOTE: Generic HTTP Access
 * 
 * This tool gives the AI the ability to fetch any URL.
 * It's more flexible than the search tool but requires
 * the AI to know what URL to fetch.
 * 
 * Use cases:
 * - Fetching API data
 * - Reading web pages
 * - Downloading JSON/XML data
 * 
 * Security considerations:
 * - Block internal/localhost URLs
 * - Limit response size
 * - Timeout for slow requests
 */

import type { Tool, ToolResult } from '../../types/tool.js';
import { validateUrl } from '../../utils/validation.js';
import { httpGet, httpPost } from '../../utils/http.js';

/**
 * HTTP Fetch Tool Definition
 */
export const httpFetchTool: Tool = {
  name: 'http_fetch',
  
  description: `Fetch data from a URL. Use this tool when:
- You need to access a specific API endpoint
- You need to fetch data from a known URL
- The user provides a URL to retrieve

Supports GET and POST requests.
Returns the response as text (JSON, HTML, or plain text).

Limitations:
- Only HTTP/HTTPS URLs allowed
- Cannot access localhost or internal networks
- Maximum response size: 1MB
- Timeout: 10 seconds`,
  
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL to fetch (must be http:// or https://)',
      },
      method: {
        type: 'string',
        description: 'HTTP method (default: GET)',
        enum: ['GET', 'POST'],
      },
      body: {
        type: 'string',
        description: 'Request body for POST requests (JSON string)',
      },
    },
    required: ['url'],
  },
  
  execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
    try {
      const url = args.url as string;
      const method = (args.method as string)?.toUpperCase() || 'GET';
      const body = args.body as string | undefined;
      
      // Validate URL
      const validation = validateUrl(url);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      
      const safeUrl = validation.sanitized!;
      console.log(`🌐 HTTP ${method}: ${safeUrl}`);
      
      let response;
      
      if (method === 'POST') {
        let parsedBody: unknown = undefined;
        if (body) {
          try {
            parsedBody = JSON.parse(body);
          } catch {
            return { success: false, error: 'Invalid JSON body' };
          }
        }
        response = await httpPost(safeUrl, parsedBody);
      } else {
        response = await httpGet(safeUrl);
      }
      
      if (!response.success) {
        return { success: false, error: response.error };
      }
      
      // Try to parse as JSON
      let data: unknown = response.data;
      let contentType = 'text';
      
      try {
        data = JSON.parse(response.data!);
        contentType = 'json';
      } catch {
        // Keep as text
      }
      
      console.log(`   Status: ${response.status}, Type: ${contentType}`);
      
      return {
        success: true,
        result: {
          url: safeUrl,
          method,
          status: response.status,
          contentType,
          data,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'HTTP request failed',
      };
    }
  },
};

