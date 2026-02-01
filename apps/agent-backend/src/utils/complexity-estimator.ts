/**
 * ==========================================
 * Complexity Estimation Utility
 * ==========================================
 * 
 * LEARNING NOTE: Estimating Task Complexity
 * 
 * Not all AI tasks are equal:
 * - "What time is it?" → Simple, use cheap model
 * - "Research X and summarize" → Moderate, use balanced model
 * - "Create a detailed plan" → Complex, use powerful model
 * 
 * This module estimates task complexity based on multiple factors.
 */

import type { AgentType } from '../types/agent.js';
import { TaskComplexity } from '../config/model-config.js';

/**
 * Estimate the complexity of a task
 * 
 * Factors considered:
 * 1. Agent type (some agents do inherently complex work)
 * 2. Number of tools available (more tools = more complex decisions)
 * 3. Message length (longer prompts often mean complex tasks)
 * 4. Explicit hints in the message
 */
export function estimateComplexity(params: {
  agentType: AgentType;
  toolCount: number;
  messageLength: number;
  userMessage?: string;
}): TaskComplexity {
  const { agentType, toolCount, messageLength, userMessage } = params;
  
  // Start with agent-based baseline
  let baselineComplexity = getAgentBaselineComplexity(agentType);
  
  // Adjust based on tool count
  let complexityScore = getComplexityScore(baselineComplexity);
  
  // Tools available increases complexity (agent must decide when/how to use them)
  if (toolCount > 5) {
    complexityScore += 1;  // Many tools = more complex decision-making
  }
  
  // Long messages often indicate complex tasks
  if (messageLength > 500) {
    complexityScore += 1;
  } else if (messageLength < 100) {
    complexityScore -= 1;  // Very short = likely simple
  }
  
  // Check for keywords that indicate complexity
  if (userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    
    // Simple indicators
    if (
      lowerMessage.match(/^(what|when|where|who)\s/) ||
      lowerMessage.includes('what time') ||
      lowerMessage.includes('what is') ||
      lowerMessage.match(/\d+\s*[\+\-\*\/]\s*\d+/)  // Basic math
    ) {
      complexityScore -= 1;
    }
    
    // Complex indicators
    if (
      lowerMessage.includes('plan') ||
      lowerMessage.includes('strategy') ||
      lowerMessage.includes('analyze') ||
      lowerMessage.includes('compare') ||
      lowerMessage.includes('comprehensive') ||
      lowerMessage.includes('detailed') ||
      lowerMessage.includes('coordinate') ||
      lowerMessage.includes('multi-step')
    ) {
      complexityScore += 1;
    }
    
    // Critical indicators
    if (
      lowerMessage.includes('critical') ||
      lowerMessage.includes('production') ||
      lowerMessage.includes('important decision')
    ) {
      complexityScore += 2;
    }
  }
  
  // Convert score back to complexity level
  return scoreToComplexity(complexityScore);
}

/**
 * Get baseline complexity for each agent type
 */
function getAgentBaselineComplexity(agentType: AgentType): TaskComplexity {
  switch (agentType) {
    case 'conversational':
      return TaskComplexity.SIMPLE;       // Chat is usually simple
    
    case 'researcher':
      return TaskComplexity.MODERATE;     // Research requires gathering info
    
    case 'orchestrator':
      return TaskComplexity.COMPLEX;      // Coordination is sophisticated
    
    case 'automation':
      return TaskComplexity.MODERATE;     // Automation is task-dependent
    
    default:
      return TaskComplexity.MODERATE;
  }
}

/**
 * Convert complexity enum to numeric score
 */
function getComplexityScore(complexity: TaskComplexity): number {
  switch (complexity) {
    case TaskComplexity.SIMPLE:
      return 1;
    case TaskComplexity.MODERATE:
      return 2;
    case TaskComplexity.COMPLEX:
      return 3;
    case TaskComplexity.CRITICAL:
      return 4;
    default:
      return 2;
  }
}

/**
 * Convert numeric score back to complexity enum
 */
function scoreToComplexity(score: number): TaskComplexity {
  if (score <= 1) {
    return TaskComplexity.SIMPLE;
  } else if (score === 2) {
    return TaskComplexity.MODERATE;
  } else if (score === 3) {
    return TaskComplexity.COMPLEX;
  } else {
    return TaskComplexity.CRITICAL;
  }
}

/**
 * Estimate token count for messages
 * Rough approximation: ~4 characters per token
 */
export function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 4);
}
