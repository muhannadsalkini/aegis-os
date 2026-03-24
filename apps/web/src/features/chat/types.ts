export interface Message {
  role: "user" | "assistant";
  content: string;
}

export interface ToolCall {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
}

export interface ChatUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface ChatCostInfo {
  totalCost: number;
  inputCost: number;
  outputCost: number;
  model: string;
}

export interface ChatResponse {
  success: boolean;
  data?: {
    content: string;
    toolCalls?: ToolCall[];
    usage?: ChatUsage;
    costInfo?: ChatCostInfo;
  };
  error?: string;
}
