"use client";

import { useState, useRef, useEffect } from "react";

// Types
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface ToolCall {
  toolName: string;
  args: Record<string, unknown>;
  result: unknown;
}

interface ChatResponse {
  success: boolean;
  data?: {
    content: string;
    toolCalls?: ToolCall[];
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  error?: string;
}

// API endpoint
const API_URL = "http://localhost:3001";

export default function TestConsole() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolCalls]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];
    
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setError(null);
    setToolCalls([]);

    try {
      const response = await fetch(`${API_URL}/agents/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      const data: ChatResponse = await response.json();

      if (data.success && data.data) {
        setMessages([
          ...newMessages,
          { role: "assistant", content: data.data.content },
        ]);
        if (data.data.toolCalls) {
          setToolCalls(data.data.toolCalls);
        }
        if (data.data.usage) {
          setUsage(data.data.usage);
        }
      } else {
        setError(data.error || "Unknown error occurred");
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? `Connection error: ${err.message}`
          : "Failed to connect to agent backend"
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const clearChat = () => {
    setMessages([]);
    setToolCalls([]);
    setError(null);
    setUsage(null);
  };

  return (
    <div className="min-h-screen flex flex-col bg-aegis-bg">
      {/* Header */}
      <header className="border-b border-aegis-border bg-aegis-surface/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-aegis-accent to-aegis-accentDim flex items-center justify-center">
              <span className="text-aegis-bg font-bold text-sm">⚡</span>
            </div>
            <div>
              <h1 className="font-semibold text-aegis-text">Aegis OS</h1>
              <p className="text-xs text-aegis-textDim">Test Console • Phase 1</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-aegis-success animate-pulse"></span>
              <span className="text-aegis-textDim">Backend Connected</span>
            </div>
            <button
              onClick={clearChat}
              className="px-3 py-1.5 text-xs rounded-md bg-aegis-border hover:bg-aegis-border/80 text-aegis-textDim hover:text-aegis-text transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-4xl mx-auto w-full">
        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-20">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-aegis-surface border border-aegis-border mb-4">
                <span className="text-3xl">🤖</span>
              </div>
              <h2 className="text-xl font-semibold text-aegis-text mb-2">
                Test Your Agent
              </h2>
              <p className="text-aegis-textDim max-w-md mx-auto mb-6">
                Try asking math questions to see the calculator tool in action,
                or ask about the current time!
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {[
                  "What is 25 * 48?",
                  "What time is it?",
                  "Calculate 15% of 250",
                  "What's the square root of 144?",
                ].map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => setInput(suggestion)}
                    className="px-3 py-2 text-sm rounded-lg bg-aegis-surface border border-aegis-border hover:border-aegis-accent/50 text-aegis-textDim hover:text-aegis-text transition-all"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex ${
                message.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-aegis-accent text-aegis-bg rounded-br-md"
                    : "bg-aegis-surface border border-aegis-border rounded-bl-md"
                }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>
            </div>
          ))}

          {/* Loading State */}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-aegis-surface border border-aegis-border rounded-2xl rounded-bl-md px-4 py-3">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 rounded-full bg-aegis-accent animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="w-2 h-2 rounded-full bg-aegis-accent animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="w-2 h-2 rounded-full bg-aegis-accent animate-bounce"></span>
                  </div>
                  <span className="text-aegis-textDim text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}

          {/* Error Display */}
          {error && (
            <div className="bg-aegis-error/10 border border-aegis-error/30 rounded-lg p-4">
              <p className="text-aegis-error text-sm">❌ {error}</p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Tool Calls Panel */}
        {toolCalls.length > 0 && (
          <div className="border-t border-aegis-border bg-aegis-surface/50 p-4">
            <h3 className="text-xs font-medium text-aegis-textDim mb-3 uppercase tracking-wide">
              🔧 Tool Calls
            </h3>
            <div className="space-y-2">
              {toolCalls.map((tool, index) => (
                <div
                  key={index}
                  className="bg-aegis-bg border border-aegis-accent/30 rounded-lg p-3 font-mono text-sm"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-aegis-accent">⚡</span>
                    <span className="text-aegis-text font-semibold">
                      {tool.toolName}
                    </span>
                  </div>
                  <div className="text-xs text-aegis-textDim mb-1">Args:</div>
                  <pre className="text-xs text-aegis-text bg-aegis-surface rounded p-2 overflow-x-auto">
                    {JSON.stringify(tool.args, null, 2)}
                  </pre>
                  <div className="text-xs text-aegis-textDim mt-2 mb-1">
                    Result:
                  </div>
                  <pre className="text-xs text-aegis-success bg-aegis-surface rounded p-2 overflow-x-auto">
                    {JSON.stringify(tool.result, null, 2)}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Usage Stats */}
        {usage && (
          <div className="border-t border-aegis-border px-4 py-2 flex items-center gap-4 text-xs text-aegis-textDim">
            <span>📊 Tokens: {usage.totalTokens}</span>
            <span>↗️ Prompt: {usage.promptTokens}</span>
            <span>↙️ Completion: {usage.completionTokens}</span>
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-aegis-border bg-aegis-surface/50 p-4">
          <div className="flex gap-3">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your agent something..."
              rows={1}
              className="flex-1 bg-aegis-bg border border-aegis-border rounded-xl px-4 py-3 text-aegis-text placeholder:text-aegis-textDim focus:outline-none focus:border-aegis-accent/50 resize-none"
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !input.trim()}
              className="px-6 py-3 bg-aegis-accent text-aegis-bg font-semibold rounded-xl hover:bg-aegis-accentDim disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isLoading ? "..." : "Send"}
            </button>
          </div>
          <p className="text-xs text-aegis-textDim mt-2 text-center">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </main>
    </div>
  );
}

