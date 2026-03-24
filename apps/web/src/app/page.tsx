"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import ReactMarkdown from "react-markdown";
import {
  AlertCircle,
  ArrowDown,
  ArrowUpRight,
  BookOpen,
  Bot,
  ChevronDown,
  ChevronRight,
  Coins,
  Database,
  Zap,
  Wrench,
} from "lucide-react";
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
  const apiHost = (() => {
    try {
      return new URL(API_URL).host;
    } catch {
      return "local";
    }
  })();

  const voicePill = (() => {
    switch (voiceState) {
      case "listening":
        return (
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] border border-aegis-error/30 bg-aegis-error/10 text-aegis-error">
            <span className="w-1.5 h-1.5 rounded-full bg-aegis-error animate-pulse" />
            Listening
          </span>
        );
      case "thinking":
        return (
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] border border-aegis-accent/25 bg-aegis-accent/10 text-aegis-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-aegis-accent animate-pulse" />
            Processing
          </span>
        );
      case "speaking":
        return (
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] border border-aegis-accent/30 bg-aegis-accent/10 text-aegis-accent">
            <span className="w-1.5 h-1.5 rounded-full bg-aegis-accent" />
            Speaking
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full text-[11px] border border-aegis-error/40 bg-aegis-error/15 text-aegis-error">
            <span className="w-1.5 h-1.5 rounded-full bg-aegis-error animate-pulse" />
            Voice error
          </span>
        );
    }
  })();

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

    // Add user message + an empty assistant placeholder immediately
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setInput("");
    setIsLoading(true);
    setError(null);
    setToolCalls([]);
    setIsToolCallsOpen(false);

    try {
      const response = await fetch(`${API_URL}/agents/chat/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // SSE lines are separated by \n\n; process all complete events
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? ""; // keep the incomplete tail

        for (const part of parts) {
          const line = part.trim();
          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice("data: ".length);
          let event: Record<string, unknown>;
          try { event = JSON.parse(jsonStr); } catch { continue; }

          if (event.type === "chunk") {
            // Append token to the last (assistant) bubble
            setMessages((prev) => {
              if (prev.length === 0) return prev;
              const last = prev[prev.length - 1];
              if (last.role !== "assistant") return prev;
              return [
                ...prev.slice(0, -1),
                { ...last, content: last.content + (event.text as string) },
              ];
            });
          } else if (event.type === "tool") {
            setToolCalls((prev) => [
              ...prev,
              {
                toolName: event.name as string,
                args: event.args as Record<string, unknown>,
                result: event.result,
              },
            ]);
          } else if (event.type === "done") {
            // nothing extra needed
          } else if (event.type === "error") {
            setError((event.message as string) || "Streaming error");
          }
        }
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
      <header className="border-b border-aegis-border/60 bg-aegis-surface/40 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-aegis-accent to-aegis-accentDim flex items-center justify-center">
              <Zap className="w-4 h-4 text-aegis-bg" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="font-semibold text-aegis-text">Aegis OS</h1>
              <p className="text-xs text-aegis-textDim mt-0.5">Agent Console</p>
            </div>
            <div className="hidden sm:block">{voicePill}</div>
          </div>
          <div className="flex items-center gap-3">
            <a
              href="/knowledge"
              className="px-3 py-1.5 text-xs rounded-md bg-aegis-accent/10 hover:bg-aegis-accent/20 text-aegis-accent border border-aegis-accent/30 hover:border-aegis-accent/50 transition-colors flex items-center gap-1.5"
            >
              <BookOpen className="w-4 h-4" aria-hidden="true" />
              <span>Knowledge</span>
            </a>
            <button
              onClick={clearChat}
              disabled={messages.length === 0}
              className="px-3 py-1.5 text-xs rounded-md bg-aegis-border hover:bg-aegis-border/80 text-aegis-textDim hover:text-aegis-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Clear
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
        {/* Messages Area */}
        <div
          className="relative flex-1 overflow-y-auto p-4 space-y-4 rounded-2xl border border-aegis-border/60 bg-aegis-surface/30 shadow-[0_0_0_1px_rgba(30,30,46,0.45)] mt-4"
          role="log"
          aria-live="polite"
        >
          {messages.length === 0 && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-aegis-surface/60 border border-aegis-border/70 mb-4">
                <Bot className="w-7 h-7 text-aegis-accent" aria-hidden="true" />
              </div>
              <h2 className="text-xl font-semibold text-aegis-text mb-2 tracking-tight">
                Agent Console
              </h2>
              <p className="text-aegis-textDim max-w-xl mx-auto mb-6 leading-relaxed">
                Send a prompt (or use voice) to test tools, workflows, and responses.
              </p>
              <div className="w-full max-w-2xl mx-auto flex flex-wrap gap-2 justify-center items-center">
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
                    className="px-3 py-2 text-sm rounded-lg bg-aegis-surface/50 border border-aegis-border/70 hover:border-aegis-accent/60 hover:bg-aegis-surface text-aegis-textDim hover:text-aegis-text transition-all"
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
                className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
              >
                <div
                  className={`max-w-[80%] rounded-2xl px-4 py-3 border shadow-sm ${message.role === "user"
                      ? "bg-aegis-accent text-aegis-bg border-aegis-accent/35 rounded-br-md"
                      : "bg-aegis-surface border-aegis-border/60 text-aegis-text rounded-bl-md"
                    }`}
                >
                  {message.role === "user" ? (
                    <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
                      {message.content}
                    </p>
                  ) : (
                    <div className="prose prose-sm prose-invert max-w-none break-words text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-aegis-text [&_code]:bg-aegis-bg/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-aegis-accent [&_code]:font-mono [&_pre]:bg-aegis-bg/60 [&_pre]:border [&_pre]:border-aegis-border/60 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_a]:text-aegis-accent [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-aegis-accent/50 [&_blockquote]:pl-3 [&_blockquote]:text-aegis-textDim">
                      <ReactMarkdown>{message.content}</ReactMarkdown>
                    </div>
                  )}
                </div>

                {message.role === "assistant" &&
                  index === lastAssistantIndex &&
                  toolCalls.length > 0 && (
                    <div className="max-w-[80%] w-full mt-2">
                      <button
                        type="button"
                        onClick={() => setIsToolCallsOpen(v => !v)}
                        aria-expanded={isToolCallsOpen}
                        className={`w-full flex items-center justify-between gap-3 px-3 py-2 border border-aegis-border/60 bg-aegis-surface/40 rounded-xl hover:border-aegis-accent/60 transition-colors ${!isToolCallsOpen ? "tool-pulse" : ""
                          }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <Wrench className="w-4 h-4 text-aegis-accent" aria-hidden="true" />
                          <span className="text-xs font-medium text-aegis-textDim uppercase tracking-wide">
                            Tool calls
                          </span>
                        </span>
                        <span className="flex items-center gap-3">
                          <span className="text-xs text-aegis-textDim">
                            {toolCalls.length} {toolCalls.length === 1 ? "call" : "calls"}
                          </span>
                          {isToolCallsOpen ? (
                            <ChevronDown className="w-4 h-4 text-aegis-textDim" aria-hidden="true" />
                          ) : (
                            <ChevronRight className="w-4 h-4 text-aegis-textDim" aria-hidden="true" />
                          )}
                        </span>
                      </button>

                      {isToolCallsOpen && (
                        <div className="mt-2 space-y-2">
                          {toolCalls.map((tool, idx) => (
                            <div
                              key={`${tool.toolName}-${idx}`}
                              className="bg-aegis-bg/40 border border-aegis-accent/25 rounded-xl p-3 backdrop-blur-sm"
                            >
                              <div className="flex items-center justify-between gap-3 mb-2">
                                <div className="flex items-center gap-2 min-w-0">
                                  <Zap className="w-4 h-4 text-aegis-accent" aria-hidden="true" />
                                  <span className="text-aegis-text font-semibold text-sm truncate font-mono">
                                    {tool.toolName}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <details
                                  open
                                  className="bg-aegis-surface/40 rounded-lg border border-aegis-border/60 px-3 py-2"
                                >
                                  <summary className="cursor-pointer select-none text-xs font-medium text-aegis-textDim flex items-center gap-2">
                                    Args
                                  </summary>
                                  <pre className="text-xs text-aegis-text bg-aegis-bg/50 border border-aegis-border/60 rounded-md p-2 overflow-x-auto mt-2 font-mono">
                                    {JSON.stringify(tool.args ?? {}, null, 2)}
                                  </pre>
                                </details>

                                <details
                                  open
                                  className="bg-aegis-surface/40 rounded-lg border border-aegis-border/60 px-3 py-2"
                                >
                                  <summary className="cursor-pointer select-none text-xs font-medium text-aegis-textDim flex items-center gap-2">
                                    Result
                                  </summary>
                                  <pre className="text-xs text-aegis-success bg-aegis-bg/50 border border-aegis-border/60 rounded-md p-2 overflow-x-auto mt-2 font-mono">
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
              <div className="bg-aegis-surface/40 border border-aegis-border/60 rounded-2xl rounded-bl-md px-4 py-3 tool-pulse">
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
            <div className="bg-aegis-error/10 border border-aegis-error/40 rounded-2xl p-4">
              <p className="text-aegis-error text-sm leading-relaxed flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                <span>{error}</span>
              </p>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Voice Status Bar */}
        {/* <VoiceStatusBar
          state={voiceState}
          partialTranscript={partialTranscript}
          errorMsg={voiceError}
          onStop={stopSession}
          onRetryError={startListening}
        /> */}

        {/* Usage Stats */}
        {(usage || costInfo) && (
          <div className="mt-4 px-4 py-3 rounded-2xl border border-aegis-border/60 bg-aegis-surface/20 flex flex-wrap items-center gap-4 text-xs text-aegis-textDim">
            {usage && (
              <>
                <span className="inline-flex items-center gap-2">
                  <Database className="w-4 h-4 text-aegis-accent/80" aria-hidden="true" />
                  Tokens: {usage.totalTokens}
                </span>
                <span className="inline-flex items-center gap-2">
                  <ArrowUpRight className="w-4 h-4 text-aegis-textDim" aria-hidden="true" />
                  Prompt: {usage.promptTokens}
                </span>
                <span className="inline-flex items-center gap-2">
                  <ArrowDown className="w-4 h-4 text-aegis-textDim" aria-hidden="true" />
                  Completion: {usage.completionTokens}
                </span>
              </>
            )}

            {costInfo && (
              <>
                <div className="w-px h-3 bg-aegis-border mx-1"></div>
                <span className="inline-flex items-center gap-2 text-aegis-accent font-medium">
                  <Coins className="w-4 h-4" aria-hidden="true" />
                  Cost: {formatCost(costInfo.totalCost)}
                </span>
                <span
                  title="Model used"
                  className="inline-flex items-center gap-2"
                >
                  <Bot className="w-4 h-4 text-aegis-textDim" aria-hidden="true" />
                  {costInfo.model}
                </span>
              </>
            )}
          </div>
        )}

        {/* Input Area */}
        <div className="mt-4 rounded-2xl border border-aegis-border/60 bg-aegis-surface/30 p-4 shrink-0 transition-all flex flex-col gap-3">
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
              className="flex-1 bg-aegis-bg border border-aegis-border/70 rounded-xl px-4 py-3 text-aegis-text placeholder:text-aegis-textDim text-sm leading-relaxed focus:outline-none focus:border-aegis-accent/50 resize-none"
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
                className="px-6 py-3 bg-aegis-accent text-aegis-bg font-semibold rounded-xl hover:bg-aegis-accentDim disabled:opacity-50 disabled:cursor-not-allowed transition-colors grow inline-flex items-center justify-center gap-2"
              >
                {isLoading ? "..." : "Send"}
                <svg
                  className="w-4 h-4"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M22 2L11 13" />
                  <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
        <p className="text-xs text-aegis-textDim my-1 text-center">
          Press Enter to send | Shift+Enter for new line
        </p>
      </main>
    </div>
  );
}

