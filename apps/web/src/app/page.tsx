"use client";

import { useState, useCallback } from "react";
import { ArrowDown, ArrowUpRight, Coins, Database, Bot } from "lucide-react";

import { Header } from "../components/layout/Header";
import { ChatList } from "../features/chat/components/ChatList";
import { ChatInput } from "../features/chat/components/ChatInput";
import { useChatStream } from "../features/chat/hooks/useChatStream";
import { formatCost } from "../lib/utils";

import { useVoiceAgent } from "../features/voice/hooks/useVoiceAgent";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export default function TestConsole() {
  const [input, setInput] = useState("");

  const {
    messages,
    setMessages,
    isLoading,
    toolCalls,
    setToolCalls,
    error,
    usage,
    costInfo,
    sendMessage,
    clearChat,
  } = useChatStream(API_URL);

  // Voice message handlers
  const handleUserMessage = useCallback((text: string) => {
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setToolCalls([]);
  }, [setMessages, setToolCalls]);

  const handleAssistantSentence = useCallback((text: string, isFirst: boolean) => {
    if (isFirst) {
      setMessages((prev) => [...prev, { role: "assistant", content: text }]);
    } else {
      setMessages((prev) => {
        if (prev.length === 0) return prev;
        const last = prev[prev.length - 1];
        if (last.role !== "assistant") return prev;
        return [
          ...prev.slice(0, -1),
          { ...last, content: last.content + " " + text },
        ];
      });
    }
  }, [setMessages]);

  const handleToolCall = useCallback((toolName: string, args: unknown, result: unknown) => {
    setToolCalls((prev) => [
      ...prev,
      { toolName, args: args as Record<string, unknown>, result },
    ]);
  }, [setToolCalls]);

  // Voice capabilities
  const {
    voiceState,
    startListening,
    stopSession,
    getByteFrequencyData,
  } = useVoiceAgent({
    apiUrl: API_URL,
    onUserMessage: handleUserMessage,
    onAssistantSentence: handleAssistantSentence,
    onToolCall: handleToolCall,
  });

  const isVoiceActive = voiceState !== "idle";

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
      default:
        return null;
    }
  })();

  const handleSendMessage = () => {
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-aegis-bg">
      <Header
        onClearChat={clearChat}
        isClearDisabled={messages.length === 0}
        voicePill={voicePill}
      />

      <main className="flex-1 flex flex-col max-w-5xl mx-auto w-full">
        <ChatList
          messages={messages}
          toolCalls={toolCalls}
          isLoading={isLoading}
          error={error}
          setInput={setInput}
        />

        {/* Usage Stats - kept in page since it's global layout info */}
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
                <span className="inline-flex items-center gap-2">
                  <Bot className="w-4 h-4 text-aegis-textDim" aria-hidden="true" />
                  {costInfo.model}
                </span>
              </>
            )}
          </div>
        )}

        <ChatInput
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          isVoiceActive={isVoiceActive}
          voiceState={voiceState}
          sendMessage={handleSendMessage}
          startListening={startListening}
          stopSession={stopSession}
          getByteFrequencyData={getByteFrequencyData}
        />

        <p className="text-xs text-aegis-textDim my-1 text-center">
          Press Enter to send | Shift+Enter for new line
        </p>
      </main>
    </div>
  );
}
