"use client";

import { KeyboardEvent, useEffect, useRef } from "react";
import { VoiceWaveform } from "../../voice/components/VoiceWaveform";
import { MicButton } from "../../voice/components/MicButton";

interface ChatInputProps {
  input: string;
  setInput: (value: string) => void;
  isLoading: boolean;
  isVoiceActive: boolean;
  voiceState: string;
  sendMessage: () => void;
  startListening: () => void;
  stopSession: () => void;
  getByteFrequencyData: () => Uint8Array;
}

export function ChatInput({
  input,
  setInput,
  isLoading,
  isVoiceActive,
  voiceState,
  sendMessage,
  startListening,
  stopSession,
  getByteFrequencyData,
}: ChatInputProps) {
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  useEffect(() => {
    const textarea = inputRef.current;
    if (textarea) {
      // Reset height to auto to recalculate
      textarea.style.height = "auto";
      
      const maxHeight = 200;
      const scrollHeight = textarea.scrollHeight;
      
      textarea.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
      textarea.style.overflowY = scrollHeight > maxHeight ? "auto" : "hidden";
    }
  }, [input]);

  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-aegis-border/60 bg-aegis-surface/30 p-4 shrink-0 transition-all flex flex-col gap-3">
      {isVoiceActive && voiceState !== "error" && (
        <div className="w-full animation-in slide-in-from-bottom-2 fade-in">
          <VoiceWaveform state={voiceState as any} getByteFrequencyData={getByteFrequencyData} />
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
          style={{ minHeight: "46px" }}
        />
        <div className="shrink-0 flex items-center">
          <MicButton
            state={voiceState as any}
            onClick={isVoiceActive ? stopSession : startListening}
            disabled={isLoading}
          />
        </div>
        <div className="flex flex-col gap-2 shrink-0">
          <button
            onClick={() => sendMessage()}
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
  );
}
