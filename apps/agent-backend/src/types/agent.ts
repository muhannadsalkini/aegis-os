/**
 * ==========================================
 * Agent Type Definitions
 * ==========================================
 * 
 * LEARNING NOTE: What is an "Agent"?
 * 
 * An agent is more than just an LLM call. An agent is an LLM that:
 * 1. Has a specific personality/role (system prompt)
 * 2. Has access to tools
 * 3. Can reason about when to use those tools
 * 4. Can maintain conversation context
 * 5. Can potentially call other agents
 * 
 * Think of agents as specialized workers, each with their own
 * job description and toolkit.
 */

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { Tool } from './tool.js';
import type { TaskComplexity, CostInfo } from '../config/model-config.js';

/**
 * Types of agents in Aegis OS
 * 
 * Each type has different capabilities:
 * - conversational: General chat, helpful assistant
 * - researcher: Web search, information gathering
 * - orchestrator: Coordinates other agents
 * - automation: Runs scheduled tasks
 */
export type AgentType = 'conversational' | 'researcher' | 'orchestrator' | 'automation';

/**
 * Configuration for creating an agent
 */
export interface AgentConfig {
  /**
   * Unique identifier for the agent
   */
  id: string;
  
  /**
   * Display name for the agent
   */
  name: string;
  
  /**
   * What type of agent this is
   */
  type: AgentType;
  
  /**
   * The system prompt that defines the agent's personality and behavior
   * 
   * LEARNING NOTE: System Prompt Tips
   * - Be specific about the agent's role
   * - Define how it should handle edge cases
   * - Specify the format of responses
   * - Include any constraints or rules
   */
  systemPrompt: string;
  
  /**
   * Which tools this agent can use
   * Not all agents need all tools!
   */
  tools: Tool[];
  
  /**
   * The model to use (optional, defaults to env setting)
   */
  model?: string;
  
  /**
   * Task complexity level for this agent (optional)
   * If not specified, will be estimated automatically
   */
  complexity?: TaskComplexity;
  
  /**
   * Model preference strategy (optional)
   * - 'auto': Use complexity-based selection (default)
   * - 'fixed': Always use the specified model
   * - 'cost-optimized': Choose cheapest model for complexity
   */
  modelPreference?: 'auto' | 'fixed' | 'cost-optimized';
  
  /**
   * Temperature for response creativity (0-2)
   * - 0: Very focused/deterministic
   * - 1: Balanced (default)
   * - 2: Very creative/random
   */
  temperature?: number;
}

/**
 * A message in the conversation
 * This is compatible with OpenAI's message format
 */
export type Message = ChatCompletionMessageParam;

/**
 * The context passed to an agent for processing
 */
export interface AgentContext {
  /**
   * The conversation history
   */
  messages: Message[];
  
  /**
   * Optional metadata (user ID, session ID, etc.)
   */
  metadata?: Record<string, unknown>;
}

/**
 * Response from an agent
 */
export interface AgentResponse {
  /**
   * The agent's text response
   */
  content: string;
  
  /**
   * Any tool calls that were made
   */
  toolCalls?: ToolCallInfo[];
  
  /**
   * Usage statistics
   */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  
  /**
   * Cost information for this request
   */
  costInfo?: CostInfo;
}

/**
 * Information about a tool call that was executed
 */
export interface ToolCallInfo {
  /**
   * The tool that was called
   */
  toolName: string;
  
  /**
   * The arguments passed to the tool
   */
  args: Record<string, unknown>;
  
  /**
   * The result from the tool
   */
  result: unknown;
}


