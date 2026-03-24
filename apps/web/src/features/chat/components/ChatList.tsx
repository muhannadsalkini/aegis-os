"use client";

import { useEffect, useRef } from "react";
import { Message, ToolCall } from "../types";
import { ChatMessage } from "./ChatMessage";
import { Bot, AlertCircle } from "lucide-react";

interface ChatListProps {
  messages: Message[];
  toolCalls: ToolCall[];
  isLoading: boolean;
  error: string | null;
  setInput: (val: string) => void;
}

export function ChatList({
  messages,
  toolCalls,
  isLoading,
  error,
  setInput,
}: ChatListProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, toolCalls, isLoading]);

  return (
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
          <ChatMessage
            key={index}
            message={message}
            isLastAssistant={index === lastAssistantIndex}
            toolCalls={toolCalls}
          />
        ));
      })()}

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
  );
}
