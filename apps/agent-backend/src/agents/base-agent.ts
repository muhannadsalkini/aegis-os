/**
 * ==========================================
 * 🤖 Base Agent - The Heart of Aegis OS
 * ==========================================
 * 
 * LEARNING NOTE: Understanding Function Calling (Tool Use)
 * 
 * This is THE most important file for understanding how AI agents work.
 * Let me explain the flow:
 * 
 * ┌─────────────────────────────────────────────────────────────────┐
 * │                    THE FUNCTION CALLING LOOP                    │
 * ├─────────────────────────────────────────────────────────────────┤
 * │                                                                 │
 * │  1. User sends a message                                        │
 * │     "What is 15 * 37 + 42?"                                     │
 * │                              ↓                                  │
 * │  2. We send message + available tools to the LLM                │
 * │     The LLM sees: "User wants math, I have a calculator tool"   │
 * │                              ↓                                  │
 * │  3. LLM responds with a TOOL CALL (not text!)                   │
 * │     { tool: "calculator", args: { operation: "multiply",        │
 * │                                   a: 15, b: 37 } }              │
 * │                              ↓                                  │
 * │  4. WE execute the tool (the LLM doesn't run code!)             │
 * │     calculator(multiply, 15, 37) = 555                          │
 * │                              ↓                                  │
 * │  5. We send the tool result BACK to the LLM                     │
 * │     "The calculator returned 555"                               │
 * │                              ↓                                  │
 * │  6. LLM continues, might call another tool...                   │
 * │     { tool: "calculator", args: { operation: "add",             │
 * │                                   a: 555, b: 42 } }             │
 * │                              ↓                                  │
 * │  7. We execute again, send result back                          │
 * │     calculator(add, 555, 42) = 597                              │
 * │                              ↓                                  │
 * │  8. LLM finally responds with TEXT                              │
 * │     "15 × 37 + 42 = 597"                                        │
 * │                                                                 │
 * └─────────────────────────────────────────────────────────────────┘
 * 
 * This loop is called the "agentic loop" or "tool use loop".
 * The agent keeps going until it has a final answer.
 */

import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
  ChatCompletionAssistantMessageParam,
} from 'openai/resources/chat/completions';
import { openai, defaultModel } from '../config/openai.js';
import { toOpenAITool } from '../types/tool.js';
import type { AgentConfig, AgentContext, AgentResponse, ToolCallInfo } from '../types/agent.js';
import { executeTool } from '../tools/index.js';
import { estimateComplexity, estimateTokenCount } from '../utils/complexity-estimator.js';
import { selectModel, calculateCost, formatCost, OpenAIModel, TaskComplexity } from '../config/model-config.js';

/**
 * Maximum number of tool call iterations
 * Prevents infinite loops if something goes wrong
 */
const MAX_ITERATIONS = 10;

/**
 * BaseAgent - The foundation for all agents
 * 
 * This class handles:
 * 1. Sending messages to the LLM
 * 2. Detecting when the LLM wants to call tools
 * 3. Executing those tools
 * 4. Feeding results back to the LLM
 * 5. Repeating until we get a final answer
 */
export class BaseAgent {
  private config: AgentConfig;
  
  constructor(config: AgentConfig) {
    this.config = config;
    console.log(`🤖 Created agent: ${config.name} (${config.type})`);
  }
  
  /**
   * Process a conversation and generate a response
   * 
   * This is the main entry point for the agent.
   * It handles the full tool-calling loop.
   */
  async chat(context: AgentContext): Promise<AgentResponse> {
    // Build the messages array with system prompt
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: this.config.systemPrompt },
      ...context.messages,
    ];
    
    // Convert our tools to OpenAI format
    const tools = this.config.tools.map(toOpenAITool);
    
    // Track all tool calls made during this conversation turn
    const allToolCalls: ToolCallInfo[] = [];
    
    // Iteration counter to prevent infinite loops
    let iterations = 0;
    
    /**
     * THE AGENTIC LOOP
     * 
     * We keep calling the LLM until it responds with just text
     * (no more tool calls). Each iteration might involve
     * executing tools and feeding results back.
     */
    while (iterations < MAX_ITERATIONS) {
      iterations++;
      console.log(`\n📍 Iteration ${iterations}`);
      
      // Determine which model to use
      let modelToUse = this.config.model || defaultModel;
      let estimatedComplexity: TaskComplexity | undefined;
      
      // Only do dynamic selection on first iteration
      if (iterations === 1) {
        const strategy = this.config.modelPreference || 'auto';
        
        if (strategy === 'auto' || strategy === 'cost-optimized') {
          // Get the user's message for complexity estimation
          const userMessage = context.messages.find(m => m.role === 'user')?.content?.toString() || '';
          
          // Estimate complexity
          estimatedComplexity = this.config.complexity || estimateComplexity({
            agentType: this.config.type,
            toolCount: this.config.tools.length,
            messageLength: userMessage.length,
            userMessage,
          });
          
          // Select model based on complexity
          const selectedModel = selectModel(
            estimatedComplexity,
            strategy === 'cost-optimized' ? 0.05 : undefined  // 5 cents max for cost-optimized
          );
          
          modelToUse = selectedModel;
          
          console.log(`🎯 Complexity: ${estimatedComplexity}, Model: ${modelToUse}`);
        } else {
          console.log(`🔒 Using fixed model: ${modelToUse}`);
        }
      }
      
      // Call the OpenAI API
      const response = await openai.chat.completions.create({
        model: modelToUse,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        temperature: this.config.temperature ?? 0.7,
      });
      
      // Get the assistant's response
      const choice = response.choices[0];
      if (!choice) {
        throw new Error('No response received from OpenAI');
      }
      const assistantMessage = choice.message;
      
      // Add the assistant's message to our conversation
      messages.push(assistantMessage);
      
      /**
       * Check: Did the LLM want to call any tools?
       * 
       * If tool_calls exists and has items, the LLM is asking
       * us to run tools before it can answer.
       */
      if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
        console.log(`🔧 LLM requested ${assistantMessage.tool_calls.length} tool call(s)`);
        
        // Execute each tool the LLM requested
        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolArgs = JSON.parse(toolCall.function.arguments);
          
          console.log(`   → Calling: ${toolName}`);
          console.log(`     Args: ${JSON.stringify(toolArgs)}`);
          
          // Execute the tool
          const result = await executeTool(toolName, toolArgs);
          
          // Track this tool call for our response
          allToolCalls.push({
            toolName,
            args: toolArgs,
            result: result.success ? result.result : result.error,
          });
          
          /**
           * IMPORTANT: Send the tool result back to the LLM
           * 
           * The tool_call_id must match so the LLM knows
           * which tool call this result corresponds to.
           */
          const toolMessage: ChatCompletionToolMessageParam = {
            role: 'tool',
            tool_call_id: toolCall.id,
            content: JSON.stringify(result),
          };
          
          messages.push(toolMessage);
        }
        
        // Continue the loop - the LLM might need more tools or be ready to answer
        continue;
      }
      
      /**
       * No more tool calls - the LLM has a final answer!
       * 
       * Extract the response and return it.
       */
      console.log(`✅ Final response received after ${iterations} iteration(s)`);
      
      // Calculate cost if we have usage data
      let costInfo;
      if (response.usage) {
        try {
          const modelUsed = (this.config.model || defaultModel) as OpenAIModel;
          costInfo = calculateCost(
            modelUsed,
            response.usage.prompt_tokens,
            response.usage.completion_tokens
          );
          
          console.log(`💰 Cost: ${formatCost(costInfo.totalCost)} (${costInfo.inputTokens} in, ${costInfo.outputTokens} out)`);
        } catch (error) {
          // If model not in catalog, skip cost calculation
          console.warn(`⚠️  Could not calculate cost for model: ${this.config.model || defaultModel}`);
        }
      }
      
      return {
        content: assistantMessage.content || '',
        toolCalls: allToolCalls.length > 0 ? allToolCalls : undefined,
        usage: response.usage ? {
          promptTokens: response.usage.prompt_tokens,
          completionTokens: response.usage.completion_tokens,
          totalTokens: response.usage.total_tokens,
        } : undefined,
        costInfo,
      };
    }
    
    // If we hit max iterations, something went wrong
    throw new Error(`Agent exceeded maximum iterations (${MAX_ITERATIONS})`);
  }

  /**
   * chatStream — Streaming version for voice agent use.
   *
   * Uses OpenAI streaming mode and yields complete sentences one by one as
   * soon as they are formed, so the TTS layer can start speaking the first
   * sentence while the LLM is still generating the rest.
   *
   * For tool calls: we still handle them, but we buffer the full output and
   * restart streaming after the tool results come back.
   */
  async *chatStream(context: AgentContext, signal?: AbortSignal): AsyncGenerator<string> {
    const messages: ChatCompletionMessageParam[] = [
      { role: 'system', content: this.config.systemPrompt },
      ...context.messages,
    ];

    const tools = this.config.tools.map(toOpenAITool);
    let iterations = 0;

    while (iterations < MAX_ITERATIONS) {
      if (signal?.aborted) return;
      iterations++;

      // Determine model (same logic as chat())
      let modelToUse = this.config.model || defaultModel;
      if (iterations === 1) {
        const strategy = this.config.modelPreference || 'auto';
        if (strategy === 'auto' || strategy === 'cost-optimized') {
          const userMessage = context.messages.find(m => m.role === 'user')?.content?.toString() || '';
          const estimatedComplexity = this.config.complexity || estimateComplexity({
            agentType: this.config.type,
            toolCount: this.config.tools.length,
            messageLength: userMessage.length,
            userMessage,
          });
          modelToUse = selectModel(estimatedComplexity, strategy === 'cost-optimized' ? 0.05 : undefined);
        }
      }

      const stream = await openai.chat.completions.create({
        model: modelToUse,
        messages,
        tools: tools.length > 0 ? tools : undefined,
        temperature: this.config.temperature ?? 0.7,
        stream: true,
      });

      // Accumulate the streamed response
      let buffer = '';           // Pending partial sentence
      let fullContent = '';      // Full assistant text for history
      const toolCallAccum: Record<number, { id: string; name: string; args: string }> = {};

      for await (const chunk of stream) {
        if (signal?.aborted) return;   // Check abort at every streaming token
        const delta = chunk.choices[0]?.delta;
        if (!delta) continue;

        // Accumulate tool call deltas
        // Guard against empty arrays: `delta.tool_calls` can be `[]` (truthy!)
        // when there are actually no tool calls, which would break hasToolCalls logic.
        if (delta.tool_calls && delta.tool_calls.length > 0) {
          for (const tc of delta.tool_calls) {
            const idx = tc.index;
            if (!toolCallAccum[idx]) {
              // Initialize with empty name — we'll accumulate it via +=
              // (do NOT pre-seed from tc.function?.name here, otherwise the
              //  first chunk would be counted twice because we also += below)
              toolCallAccum[idx] = { id: tc.id ?? '', name: '', args: '' };
            }
            if (tc.id) toolCallAccum[idx].id = tc.id;
            if (tc.function?.name) toolCallAccum[idx].name += tc.function.name;
            if (tc.function?.arguments) toolCallAccum[idx].args += tc.function.arguments;
          }
        }

        // Accumulate text tokens
        if (delta.content) {
          buffer += delta.content;
          fullContent += delta.content;

          // Yield complete sentences as soon as we have them
          const sentences = extractCompleteSentences(buffer);
          if (sentences.ready.length > 0) {
            yield sentences.ready;
            buffer = sentences.remainder;
          }
        }
      }

      // Yield whatever's left in the buffer (last fragment)
      if (buffer.trim()) {
        yield buffer.trim();
      }

      // Use the accumulator length as ground truth — NOT hasToolCalls bool
      const toolCallsList = Object.values(toolCallAccum);
      if (toolCallsList.length === 0) {
        // No tool calls — we're done streaming the response
        messages.push({ role: 'assistant', content: fullContent });
        return;
      }

      // Handle tool calls — execute and loop back
      const assistantMsg: ChatCompletionAssistantMessageParam = {
        role: 'assistant',
        content: fullContent || null,
        tool_calls: toolCallsList.map(tc => ({
          id: tc.id,
          type: 'function' as const,
          function: { name: tc.name, arguments: tc.args },
        })),
      };
      messages.push(assistantMsg);

      for (const tc of toolCallsList) {
        if (signal?.aborted) return;   // Check abort before each tool execution
        const toolArgs = JSON.parse(tc.args || '{}');
        const result = await executeTool(tc.name, toolArgs);
        const toolMsg: ChatCompletionToolMessageParam = {
          role: 'tool',
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        };
        messages.push(toolMsg);
      }
    }

    throw new Error(`Agent exceeded maximum iterations (${MAX_ITERATIONS})`);
  }

  /**
   * Get the agent's configuration
   */
  getConfig(): AgentConfig {
    return this.config;
  }
}

/**
 * LEARNING NOTES: Key Takeaways
 * 
 * 1. The LLM doesn't execute code - WE do!
 *    The LLM just tells us what tool to call and with what arguments.
 * 
 * 2. Tool results go back to the LLM
 *    After we execute a tool, we send the result back so the LLM
 *    can use it in its response.
 * 
 * 3. Multiple tool calls are possible
 *    The LLM might need several tools to answer one question.
 *    That's why we have a loop.
 * 
 * 4. The loop ends when there are no more tool calls
 *    When the LLM is ready to give a final answer, it just
 *    responds with text (no tool_calls).
 * 
 * 5. The system prompt is crucial
 *    It tells the LLM what tools are available and how to use them.
 *    OpenAI automatically injects tool descriptions, but a good
 *    system prompt helps guide behavior.
 */


/**
 * Split accumulated streaming text into complete sentences (ready for TTS) and
 * a trailing partial sentence (keep buffering).
 *
 * Splits on `.  ?  !  :` when followed by whitespace or end-of-string.
 */
function extractCompleteSentences(text: string): { ready: string; remainder: string } {
  const sentenceEnd = /([.?!:])(?=\s|$)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = sentenceEnd.exec(text)) !== null) {
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex === 0) return { ready: '', remainder: text };
  return {
    ready: text.slice(0, lastIndex).trim(),
    remainder: text.slice(lastIndex),
  };
}
