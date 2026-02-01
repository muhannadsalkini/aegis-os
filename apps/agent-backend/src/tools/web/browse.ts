/**
 * ==========================================
 * Web Browse Tool - Phase 4
 * ==========================================
 * 
 * LEARNING NOTE: Web Browsing for Agents
 * 
 * This tool allows agents to "browse" web pages by:
 * 1. Fetching the HTML content
 * 2. Parsing and extracting the main content
 * 3. Removing navigation, ads, and other noise
 * 4. Converting to readable markdown text
 * 
 * This is crucial for the Researcher agent's ReAct loop:
 * Search → Browse → Extract → Summarize
 */

import type { Tool } from '../../types/tool.js';
import * as cheerio from 'cheerio';

/**
 * Extract main content from HTML
 * Uses heuristics to find the main article/content area
 */
function extractMainContent(html: string, url: string): {
  title: string;
  content: string;
  links: string[];
} {
  const $ = cheerio.load(html);
  
  // Remove script, style, nav, header, footer elements
  $('script, style, nav, header, footer, .sidebar, .advertisement, .ad').remove();
  
  // Try to find the main content area
  let title = $('title').text().trim() || 
              $('h1').first().text().trim() || 
              'Untitled';
  
  // Look for main content in common containers
  const contentSelectors = [
    'main',
    'article',
    '[role="main"]',
    '.main-content',
    '.article-content',
    '#content',
    '.content',
    'body'
  ];
  
  let contentElement = null;
  for (const selector of contentSelectors) {
    const el = $(selector).first();
    if (el.length > 0) {
      contentElement = el;
      break;
    }
  }
  
  if (!contentElement) {
    contentElement = $('body');
  }
  
  // Extract text content
  let content = '';
  contentElement.find('p, h1, h2, h3, h4, h5, h6, li, blockquote').each((_: number, elem: cheerio.Element) => {
    const text = $(elem).text().trim();
    if (text && 'tagName' in elem) {
      const tagName = elem.tagName.toLowerCase();
      if (tagName.startsWith('h')) {
        content += `\n\n## ${text}\n`;
      } else if (tagName === 'li') {
        content += `- ${text}\n`;
      } else if (tagName === 'blockquote') {
        content += `\n> ${text}\n`;
      } else {
        content += `${text}\n\n`;
      }
    }
  });
  
  // Extract links
  const links: string[] = [];
  contentElement.find('a[href]').each((_: number, elem: cheerio.Element) => {
    const href = $(elem).attr('href');
    if (href) {
      try {
        const absoluteUrl = new URL(href, url).href;
        if (absoluteUrl.startsWith('http') && !links.includes(absoluteUrl)) {
          links.push(absoluteUrl);
        }
      } catch (e) {
        // Invalid URL, skip
      }
    }
  });
  
  return {
    title,
    content: content.trim(),
    links: links.slice(0, 10) // Limit to first 10 links
  };
}

/**
 * Web Browse Tool
 */
export const webBrowseTool: Tool = {
  name: 'web_browse',
  description: 'Browse a web page and extract its main content. Returns the page title, main text content in markdown format, and relevant links. Use this after web_search to read the actual content of pages.',
  
  parameters: {
    type: 'object',
    properties: {
      url: {
        type: 'string',
        description: 'The URL of the web page to browse'
      },
      extractLinks: {
        type: 'boolean',
        description: 'Whether to extract links from the page (default: true)'
      }
    },
    required: ['url']
  },
  
  async execute(args: Record<string, unknown>) {
    const { url, extractLinks = true } = args as { 
      url: string; 
      extractLinks?: boolean;
    };
    
    try {
      console.log(`🌐 Browsing: ${url}`);
      
      // Fetch the web page
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; AegisBot/1.0)'
        }
      });
      
      if (!response.ok) {
        return {
          success: false,
          error: `Failed to fetch page: ${response.status} ${response.statusText}`
        };
      }
      
      const html = await response.text();
      
      // Extract main content
      const extracted = extractMainContent(html, url);
      
      // Truncate content if too long (keep first 5000 chars)
      const maxContentLength = 5000;
      const truncated = extracted.content.length > maxContentLength;
      const content = truncated 
        ? extracted.content.substring(0, maxContentLength) + '\n\n[Content truncated...]'
        : extracted.content;
      
      const result = {
        url,
        title: extracted.title,
        content,
        wordCount: extracted.content.split(/\s+/).length,
        truncated,
        ...(extractLinks && { links: extracted.links })
      };
      
      console.log(`✅ Extracted ${result.wordCount} words from ${url}`);
      
      return {
        success: true,
        result
      };
      
    } catch (error) {
      console.error('Browse error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
};
