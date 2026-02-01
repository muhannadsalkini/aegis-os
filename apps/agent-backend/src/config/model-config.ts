/**
 * ==========================================
 * Model Configuration & Cost Optimization
 * ==========================================
 * 
 * LEARNING NOTE: Cost-Aware Model Selection
 * 
 * Different tasks require different levels of intelligence:
 * - Simple calculations → Use cheaper models (nano)
 * - Research tasks → Use balanced models (mini)
 * - Complex planning → Use powerful models (4.1)
 * 
 * This module helps select the right model for the task,
 * optimizing cost while maintaining quality.
 */

/**
 * Task complexity levels
 * Used to determine which model to use
 */
export enum TaskComplexity {
  /** Simple tasks: basic calculations, time lookups, simple Q&A */
  SIMPLE = 'simple',
  
  /** Moderate tasks: research, multi-step reasoning, tool orchestration */
  MODERATE = 'moderate',
  
  /** Complex tasks: planning, synthesis, multi-agent coordination */
  COMPLEX = 'complex',
  
  /** Critical tasks: high-stakes decisions, detailed analysis */
  CRITICAL = 'critical',
}

/**
 * Available OpenAI models
 */
export enum OpenAIModel {
  GPT_4O_NANO = 'gpt-4o-nano',
  GPT_4O_MINI = 'gpt-4o-mini',
  GPT_4O = 'gpt-4o',
  O4_MINI = 'o4-mini',
}

/**
 * Model pricing information (per 1M tokens)
 * Source: OpenAI pricing page
 */
export interface ModelPricing {
  inputCostPer1M: number;   // Cost in USD
  outputCostPer1M: number;  // Cost in USD
  cachedInputCostPer1M?: number;  // Cached input cost (if supported)
}

/**
 * Model metadata including capabilities
 */
export interface ModelInfo {
  name: OpenAIModel;
  pricing: ModelPricing;
  contextWindow: number;
  recommendedFor: TaskComplexity[];
  description: string;
}

/**
 * Model catalog with pricing and capabilities
 */
export const MODEL_CATALOG: Record<OpenAIModel, ModelInfo> = {
  [OpenAIModel.GPT_4O_NANO]: {
    name: OpenAIModel.GPT_4O_NANO,
    pricing: {
      inputCostPer1M: 0.20,
      outputCostPer1M: 0.80,
      cachedInputCostPer1M: 0.05,
    },
    contextWindow: 128000,
    recommendedFor: [TaskComplexity.SIMPLE],
    description: 'Fastest and cheapest model for simple tasks',
  },
  
  [OpenAIModel.GPT_4O_MINI]: {
    name: OpenAIModel.GPT_4O_MINI,
    pricing: {
      inputCostPer1M: 0.80,
      outputCostPer1M: 3.20,
      cachedInputCostPer1M: 0.20,
    },
    contextWindow: 128000,
    recommendedFor: [TaskComplexity.SIMPLE, TaskComplexity.MODERATE],
    description: 'Great balance of capability and cost',
  },
  
  [OpenAIModel.GPT_4O]: {
    name: OpenAIModel.GPT_4O,
    pricing: {
      inputCostPer1M: 3.00,
      outputCostPer1M: 12.00,
      cachedInputCostPer1M: 0.75,
    },
    contextWindow: 128000,
    recommendedFor: [TaskComplexity.COMPLEX, TaskComplexity.CRITICAL],
    description: 'Most capable model for complex reasoning',
  },
  
  [OpenAIModel.O4_MINI]: {
    name: OpenAIModel.O4_MINI,
    pricing: {
      inputCostPer1M: 4.00,
      outputCostPer1M: 16.00,
      cachedInputCostPer1M: 1.00,
    },
    contextWindow: 128000,
    recommendedFor: [TaskComplexity.CRITICAL],
    description: 'Reinforcement learning model for critical tasks',
  },
};

/**
 * Default model selection strategy
 * Maps complexity to the recommended model
 */
export const DEFAULT_MODEL_SELECTION: Record<TaskComplexity, OpenAIModel> = {
  [TaskComplexity.SIMPLE]: OpenAIModel.GPT_4O_MINI, // Simplify to just use mini
  [TaskComplexity.MODERATE]: OpenAIModel.GPT_4O_MINI,
  [TaskComplexity.COMPLEX]: OpenAIModel.GPT_4O,
  [TaskComplexity.CRITICAL]: OpenAIModel.GPT_4O,
};

/**
 * Cost information for a specific request
 */
export interface CostInfo {
  model: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  inputCost: number;   // In USD
  outputCost: number;  // In USD
  totalCost: number;   // In USD
}

/**
 * Calculate the cost of a request
 */
export function calculateCost(
  model: OpenAIModel,
  inputTokens: number,
  outputTokens: number
): CostInfo {
  const modelInfo = MODEL_CATALOG[model];
  if (!modelInfo) {
    throw new Error(`Unknown model: ${model}`);
  }
  
  const inputCost = (inputTokens / 1_000_000) * modelInfo.pricing.inputCostPer1M;
  const outputCost = (outputTokens / 1_000_000) * modelInfo.pricing.outputCostPer1M;
  const totalCost = inputCost + outputCost;
  
  return {
    model,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    inputCost,
    outputCost,
    totalCost,
  };
}

/**
 * Select the best model for a given complexity level
 */
export function selectModel(
  complexity: TaskComplexity,
  maxCostPerRequest?: number
): OpenAIModel {
  // Start with the default model for this complexity
  let selectedModel = DEFAULT_MODEL_SELECTION[complexity];
  
  // If max cost is specified, find the cheapest model that meets requirements
  if (maxCostPerRequest !== undefined) {
    const recommendedModels = Object.values(MODEL_CATALOG)
      .filter(m => m.recommendedFor.includes(complexity))
      .sort((a, b) => a.pricing.inputCostPer1M - b.pricing.inputCostPer1M);
    
    // Estimate: assume 2000 input tokens, 500 output tokens
    for (const model of recommendedModels) {
      const estimatedCost = calculateCost(model.name, 2000, 500).totalCost;
      if (estimatedCost <= maxCostPerRequest) {
        selectedModel = model.name;
        break;
      }
    }
  }
  
  return selectedModel;
}

/**
 * Format cost for logging
 */
export function formatCost(cost: number): string {
  if (cost < 0.0001) {
    return `$${cost.toFixed(6)}`;
  }
  if (cost < 0.01) {
    return `$${cost.toFixed(5)}`;
  }
  return `$${cost.toFixed(4)}`;
}
