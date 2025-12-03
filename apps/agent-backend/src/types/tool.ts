/**
 * ==========================================
 * Tool Type Definitions
 * ==========================================
 * 
 * LEARNING NOTE: What is a "Tool" in AI?
 * 
 * A tool is a function that an AI can call during a conversation.
 * The AI doesn't execute code directly - instead, it:
 * 1. Receives a description of available tools
 * 2. Decides when to call a tool based on the conversation
 * 3. Outputs a structured request (JSON) to call the tool
 * 4. Your code executes the tool and returns the result
 * 5. The AI uses the result to continue the conversation
 * 
 * Think of it like the AI asking you: "Hey, can you run this calculator
 * with these numbers and tell me what you get?"
 */

import type { ChatCompletionTool } from 'openai/resources/chat/completions';

/**
 * Result of executing a tool
 * Tools can return either a successful result or an error
 */
export interface ToolResult {
  success: boolean;
  result?: unknown;
  error?: string;
}

/**
 * The function that actually executes the tool
 * Takes the parsed arguments from the AI and returns a result
 */
export type ToolExecutor = (args: Record<string, unknown>) => Promise<ToolResult>;

/**
 * A complete tool definition for Aegis OS
 * 
 * This combines:
 * - The OpenAI schema (what the AI sees)
 * - The executor function (what runs when the AI calls the tool)
 */
export interface Tool {
  /**
   * Unique identifier for the tool
   * Example: "calculator", "web_search", "send_email"
   */
  name: string;
  
  /**
   * Human-readable description
   * This is what the AI reads to understand what the tool does
   * Be clear and specific!
   */
  description: string;
  
  /**
   * JSON Schema for the tool's parameters
   * This tells the AI what arguments the tool accepts
   * 
   * LEARNING NOTE: JSON Schema Basics
   * - type: "object" means the parameters are an object
   * - properties: defines each parameter
   * - required: array of required parameter names
   */
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
  
  /**
   * The function that runs when the AI calls this tool
   */
  execute: ToolExecutor;
}

/**
 * Convert our Tool to OpenAI's ChatCompletionTool format
 * 
 * OpenAI expects a specific format for tools. This helper
 * transforms our more convenient format into theirs.
 */
export function toOpenAITool(tool: Tool): ChatCompletionTool {
  return {
    type: 'function',
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}


