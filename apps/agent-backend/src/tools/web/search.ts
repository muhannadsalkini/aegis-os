/**
 * ==========================================
 * 🔍 Web Search Tool
 * ==========================================
 * 
 * LEARNING NOTE: Web Search Integration
 * 
 * This tool uses DuckDuckGo's instant answer API which is:
 * - Free to use
 * - No API key required
 * - Returns structured data
 * 
 * For more advanced search, you could use:
 * - Google Custom Search API (requires API key)
 * - Bing Search API (requires API key)
 * - SerpAPI (requires API key)
 * - Your own web crawler
 * 
 * The key insight: The AI can now search the web for current
 * information that wasn't in its training data!
 */

import type { Tool, ToolResult } from '../../types/tool.js';
import { validateSearchQuery } from '../../utils/validation.js';
import { httpGet } from '../../utils/http.js';

/**
 * DuckDuckGo API response structure
 */
interface DDGResponse {
  Abstract?: string;
  AbstractText?: string;
  AbstractSource?: string;
  AbstractURL?: string;
  Answer?: string;
  AnswerType?: string;
  Definition?: string;
  DefinitionSource?: string;
  DefinitionURL?: string;
  Heading?: string;
  Image?: string;
  RelatedTopics?: Array<{
    Text?: string;
    FirstURL?: string;
  }>;
  Results?: Array<{
    Text?: string;
    FirstURL?: string;
  }>;
}

/**
 * Parse DuckDuckGo response into useful results
 */
function parseResults(data: DDGResponse): {
  summary: string | null;
  source: string | null;
  url: string | null;
  relatedTopics: Array<{ text: string; url: string }>;
} {
  const relatedTopics: Array<{ text: string; url: string }> = [];
  
  // Extract related topics (limit to 5)
  if (data.RelatedTopics) {
    for (const topic of data.RelatedTopics.slice(0, 5)) {
      if (topic.Text && topic.FirstURL) {
        relatedTopics.push({
          text: topic.Text,
          url: topic.FirstURL,
        });
      }
    }
  }
  
  // Extract results
  if (data.Results) {
    for (const result of data.Results.slice(0, 5)) {
      if (result.Text && result.FirstURL) {
        relatedTopics.push({
          text: result.Text,
          url: result.FirstURL,
        });
      }
    }
  }
  
  return {
    summary: data.AbstractText || data.Abstract || data.Answer || data.Definition || null,
    source: data.AbstractSource || data.DefinitionSource || null,
    url: data.AbstractURL || data.DefinitionURL || null,
    relatedTopics,
  };
}

/**
 * Web Search Tool Definition
 */
export const webSearchTool: Tool = {
  name: 'web_search',
  
  description: `Search the web for current information. Use this tool when:
- The user asks about recent events or news
- You need factual information you're not sure about
- The user asks "what is" or "who is" questions
- You need current data (prices, weather, sports scores, etc.)

This searches DuckDuckGo and returns:
- A summary/definition if available
- Related topics and links

Note: This provides instant answers. For complex research, multiple searches may be needed.`,
  
  parameters: {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'The search query. Be specific for better results.',
      },
    },
    required: ['query'],
  },
  
  execute: async (args: Record<string, unknown>): Promise<ToolResult> => {
    try {
      // Validate query
      const validation = validateSearchQuery(args.query as string);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      
      const query = validation.sanitized!;
      console.log(`🔍 Web Search: "${query}"`);
      
      // DuckDuckGo instant answer API
      const url = `https://api.duckduckgo.com/?q=${encodeURIComponent(query)}&format=json&no_html=1&skip_disambig=1`;
      
      const response = await httpGet(url, { timeout: 10000 });
      
      if (!response.success) {
        return { success: false, error: response.error };
      }
      
      // Parse JSON response
      let data: DDGResponse;
      try {
        data = JSON.parse(response.data!);
      } catch {
        return { success: false, error: 'Failed to parse search results' };
      }
      
      const results = parseResults(data);
      
      // Check if we got any results
      if (!results.summary && results.relatedTopics.length === 0) {
        return {
          success: true,
          result: {
            message: 'No instant answer found. Try a more specific query or different keywords.',
            query,
            suggestion: 'For detailed research, consider breaking the query into smaller parts.',
          },
        };
      }
      
      console.log(`   Found: ${results.summary?.substring(0, 50)}...`);
      
      return {
        success: true,
        result: {
          query,
          summary: results.summary,
          source: results.source,
          sourceUrl: results.url,
          relatedTopics: results.relatedTopics,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Search failed',
      };
    }
  },
};

