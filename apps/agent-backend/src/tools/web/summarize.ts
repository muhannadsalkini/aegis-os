/**
 * ==========================================
 * Summarization Tool - Phase 4
 * ==========================================
 * 
 * LEARNING NOTE: LLM-Powered Summarization
 * 
 * This tool uses an LLM to summarize long text content.
 * It's different from other tools because it calls an LLM internally!
 * 
 * This demonstrates a key concept: tools can themselves use AI.
 * The agent calls this tool, which then calls another LLM to do the work.
 * 
 * Flow:
 * Agent → summarize tool → OpenAI summarization → result → agent
 */

import type { Tool } from '../../types/tool.js';
import { openai, defaultModel } from '../../config/openai.js';

/**
 * Summarization Tool
 */
export const summarizeTool: Tool = {
  name: 'summarize',
  description: 'Summarize long text content into key points and a concise summary. Useful for condensing research findings, articles, or documents. Returns a brief summary and list of key facts.',
  
  parameters: {
    type: 'object',
    properties: {
      text: {
        type: 'string',
        description: 'The text to summarize'
      },
      focus: {
        type: 'string',
        description: 'Optional: What aspect to focus on in the summary (e.g., "technical details", "main arguments", "key findings")'
      },
      maxBulletPoints: {
        type: 'number',
        description: 'Maximum number of key points to extract (default: 5)'
      }
    },
    required: ['text']
  },
  
  async execute(args: Record<string, unknown>) {
    const { 
      text, 
      focus,
      maxBulletPoints = 5 
    } = args as { 
      text: string; 
      focus?: string;
      maxBulletPoints?: number;
    };
    
    try {
      console.log(`📝 Summarizing ${text.length} characters of text...`);
      
      // Truncate if text is too long (max 8000 chars)
      const maxLength = 8000;
      const truncatedText = text.length > maxLength 
        ? text.substring(0, maxLength) + '...'
        : text;
      
      // Build the summarization prompt
      const focusInstruction = focus 
        ? `Focus particularly on: ${focus}\n\n`
        : '';
      
      const prompt = `${focusInstruction}Summarize the following text.

Provide:
1. A concise 2-3 sentence summary
2. Up to ${maxBulletPoints} key points or important facts

Format as JSON:
{
  "summary": "brief overview here",
  "keyPoints": ["point 1", "point 2", ...]
}

Text to summarize:
${truncatedText}`;
      
      // Call OpenAI to summarize
      const response = await openai.chat.completions.create({
        model: defaultModel,
        messages: [
          {
            role: 'system',
            content: 'You are a expert summarizer. Extract the most important information concisely and accurately.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3, // Low temperature for consistent summaries
        response_format: { type: 'json_object' }
      });
      
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error('No response from summarization model');
      }
      
      const result = JSON.parse(content);
      
      console.log(`✅ Generated summary with ${result.keyPoints?.length || 0} key points`);
      
      return {
        success: true,
        result: {
          summary: result.summary || '',
          keyPoints: result.keyPoints || [],
          originalLength: text.length,
          compressionRatio: (text.length / (result.summary?.length || 1)).toFixed(1)
        }
      };
      
    } catch (error) {
      console.error('Summarization error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
};
