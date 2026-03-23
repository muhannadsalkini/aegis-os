"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useVoiceAgent } from "../hooks/useVoiceAgent";
import { MicButton } from "../components/voice/MicButton";
import { VoiceWaveform } from "../components/voice/VoiceWaveform";
import { VoiceStatusBar } from "../components/voice/VoiceStatusBar";

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
    costInfo?: {
      totalCost: number;
      inputCost: number;
      outputCost: number;
      model: string;
    };
  };
  error?: string;
}

// API endpoint
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function TestConsole() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [isToolCallsOpen, setIsToolCallsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<{
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  } | null>(null);
  const [costInfo, setCostInfo] = useState<{
    totalCost: number;
    inputCost: number;
    outputCost: number;
    model: string;
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Voice message handlers — stable callbacks that drive voice turns into the chat
  const handleUserMessage = useCallback((text: string) => {
    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setToolCalls([]); // clear tool cards for the new turn
    setIsToolCallsOpen(false);
  }, []);

  const handleAssistantSentence = useCallback((text: string, isFirst: boolean) => {
    if (isFirst) {
      // Open a new assistant bubble with the first sentence
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } else {
      // Append sentence to the last assistant bubble (streaming effect)
      setMessages(prev => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (last.role !== 'assistant') return prev;
        return [
          ...prev.slice(0, -1),
          { ...last, content: last.content + ' ' + text },
        ];
      });
    }
  }, []);

  const handleToolCall = useCallback((toolName: string, args: unknown, result: unknown) => {
    setToolCalls(prev => [
      ...prev,
      { toolName, args: args as Record<string, unknown>, result },
    ]);
  }, []);

  // Voice capabilities
  const {
    voiceState,
    partialTranscript,
    errorMsg: voiceError,
    startListening,
    stopSession,
    getByteFrequencyData,
  } = useVoiceAgent({
    apiUrl: API_URL,
    onUserMessage: handleUserMessage,
    onAssistantSentence: handleAssistantSentence,
    onToolCall: handleToolCall,
  });

  const isVoiceActive = voiceState !== 'idle';

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
    setIsToolCallsOpen(false);

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
        if (data.data.costInfo) {
          setCostInfo(data.data.costInfo);
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
    setIsToolCallsOpen(false);
    setError(null);
    setUsage(null);
    setCostInfo(null);
  };

  const formatCost = (cost: number) => {
    if (cost < 0.0001) return `$${cost.toFixed(6)}`;
    if (cost < 0.01) return `$${cost.toFixed(5)}`;
    return `$${cost.toFixed(4)}`;
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
            </div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/knowledge"
              className="px-3 py-1.5 text-xs rounded-md bg-aegis-accent/10 hover:bg-aegis-accent/20 text-aegis-accent border border-aegis-accent/30 hover:border-aegis-accent/50 transition-colors flex items-center gap-1.5"
            >
              <span>📚</span>
              <span>Knowledge</span>
            </a>
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
                Test your agent with math, weather, web search, and file operations!
              </p>
              <div className="flex flex-wrap gap-2 justify-center max-w-2xl">
                {[
                  "What is 25 * 48?",
                  "What's the weather in Tokyo?",
                  "Search: What is TypeScript?",
                  "What time is it in London?",
                  "List files in workspace",
                  "Read workspace/README.md",
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

          {(() => {
            let lastAssistantIndex = -1;
            for (let i = messages.length - 1; i >= 0; i--) {
              if (messages[i].role === "assistant") {
                lastAssistantIndex = i;
                break;
              }
            }

            return messages.map((message, index) => (
            <div
              key={index}
              className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"
                }`}
            >
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${message.role === "user"
                  ? "bg-aegis-accent text-aegis-bg rounded-br-md"
                  : "bg-aegis-surface border border-aegis-border rounded-bl-md"
                  }`}
              >
                <p className="whitespace-pre-wrap">{message.content}</p>
              </div>

              {message.role === "assistant" &&
                index === lastAssistantIndex &&
                toolCalls.length > 0 && (
                  <div className="max-w-[80%] w-full mt-2">
                    <button
                      type="button"
                      onClick={() => setIsToolCallsOpen(v => !v)}
                      aria-expanded={isToolCallsOpen}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 border border-aegis-border bg-aegis-surface/50 rounded-xl hover:border-aegis-accent/50 transition-colors"
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <span className="text-aegis-accent">🔧</span>
                        <span className="text-xs font-medium text-aegis-textDim uppercase tracking-wide">
                          Tool calls
                        </span>
                      </span>
                      <span className="flex items-center gap-3">
                        <span className="text-xs text-aegis-textDim">
                          {toolCalls.length} {toolCalls.length === 1 ? "call" : "calls"}
                        </span>
                        <span className="text-aegis-textDim text-sm">
                          {isToolCallsOpen ? "▾" : "▸"}
                        </span>
                      </span>
                    </button>

                    {isToolCallsOpen && (
                      <div className="mt-2 space-y-2">
                        {toolCalls.map((tool, idx) => (
                          <div
                            key={`${tool.toolName}-${idx}`}
                            className="bg-aegis-bg border border-aegis-accent/30 rounded-xl p-3"
                          >
                            <div className="flex items-center justify-between gap-3 mb-2">
                              <div className="flex items-center gap-2 min-w-0">
                                <span className="text-aegis-accent">⚡</span>
                                <span className="text-aegis-text font-semibold text-sm truncate font-mono">
                                  {tool.toolName}
                                </span>
                              </div>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                              <details
                                open
                                className="bg-aegis-surface rounded-lg border border-aegis-border px-3 py-2"
                              >
                                <summary className="cursor-pointer select-none text-xs font-medium text-aegis-textDim flex items-center gap-2">
                                  Args
                                </summary>
                                <pre className="text-xs text-aegis-text bg-aegis-bg rounded-md p-2 overflow-x-auto mt-2 font-mono">
                                  {JSON.stringify(tool.args ?? {}, null, 2)}
                                </pre>
                              </details>

                              <details
                                open
                                className="bg-aegis-surface rounded-lg border border-aegis-border px-3 py-2"
                              >
                                <summary className="cursor-pointer select-none text-xs font-medium text-aegis-textDim flex items-center gap-2">
                                  Result
                                </summary>
                                <pre className="text-xs text-aegis-success bg-aegis-bg rounded-md p-2 overflow-x-auto mt-2 font-mono">
                                  {JSON.stringify(tool.result, null, 2)}
                                </pre>
                              </details>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
            </div>
            ));
          })()}

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

        {/* Voice Status Bar */}
        <div className="px-4 pb-2">
          <VoiceStatusBar
            state={voiceState}
            partialTranscript={partialTranscript}
            errorMsg={voiceError}
            onStop={stopSession}
            onRetryError={startListening}
          />
        </div>

        {/* Usage Stats */}
        {(usage || costInfo) && (
          <div className="border-t border-aegis-border px-4 py-2 flex flex-wrap items-center gap-4 text-xs text-aegis-textDim">
            {usage && (
              <>
                <span>📊 Tokens: {usage.totalTokens}</span>
                <span>↗️ Prompt: {usage.promptTokens}</span>
                <span>↙️ Completion: {usage.completionTokens}</span>
              </>
            )}

            {costInfo && (
              <>
                <div className="w-px h-3 bg-aegis-border mx-1"></div>
                <span className="text-aegis-accent font-medium">💰 Cost: {formatCost(costInfo.totalCost)}</span>
                <span title="Model used">🤖 {costInfo.model}</span>
              </>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="border-t border-aegis-border bg-aegis-surface/50 p-4 shrink-0 transition-all flex flex-col gap-3">
          {/* Waveform Visualization (Dynamic height based on state) */}
          {isVoiceActive && voiceState !== 'error' && (
            <div className="w-full animation-in slide-in-from-bottom-2 fade-in">
              <VoiceWaveform state={voiceState} getByteFrequencyData={getByteFrequencyData} />
            </div>
          )}

          <div className="flex gap-3 items-center">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isVoiceActive || isLoading}
              placeholder={isVoiceActive ? "Voice mode active..." : "Ask your agent something..."}
              rows={1}
              className="flex-1 bg-aegis-bg border border-aegis-border rounded-xl px-4 py-3 text-aegis-text placeholder:text-aegis-textDim focus:outline-none focus:border-aegis-accent/50 resize-none"
            />
            {/* Inline voice button to keep alignment stable */}
            <div className="shrink-0 flex items-center">
              <MicButton
                state={voiceState}
                onClick={isVoiceActive ? stopSession : startListening}
                disabled={isLoading}
              />
            </div>
            <div className="flex flex-col gap-2 shrink-0">
              <button
                onClick={sendMessage}
                disabled={isLoading || !input.trim() || isVoiceActive}
                className="px-6 py-3 bg-aegis-accent text-aegis-bg font-semibold rounded-xl hover:bg-aegis-accentDim disabled:opacity-50 disabled:cursor-not-allowed transition-colors grow"
              >
                {isLoading ? "..." : "Send"}
              </button>
            </div>
          </div>
          <p className="text-xs text-aegis-textDim mt-1 text-center">
            Press Enter to send • Shift+Enter for new line
          </p>
        </div>
      </main>
    </div>
  );
}

