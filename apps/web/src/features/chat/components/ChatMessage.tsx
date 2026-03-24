"use client";

import ReactMarkdown from "react-markdown";
import { Message, ToolCall } from "../types";
import { ToolCallDisplay } from "./ToolCallDisplay";

interface ChatMessageProps {
  message: Message;
  isLastAssistant: boolean;
  toolCalls: ToolCall[];
}

export function ChatMessage({ message, isLastAssistant, toolCalls }: ChatMessageProps) {
  const isUser = message.role === "user";

  return (
    <div className={`flex flex-col ${isUser ? "items-end" : "items-start"}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 border shadow-sm ${
          isUser
            ? "bg-aegis-accent text-aegis-bg border-aegis-accent/35 rounded-br-md"
            : "bg-aegis-surface border-aegis-border/60 text-aegis-text rounded-bl-md"
        }`}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
            {message.content}
          </p>
        ) : (
          <div className="prose prose-sm prose-invert max-w-none break-words text-sm leading-relaxed [&>*:first-child]:mt-0 [&>*:last-child]:mb-0 [&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0.5 [&_h1]:text-base [&_h2]:text-sm [&_h3]:text-sm [&_strong]:text-aegis-text [&_code]:bg-aegis-bg/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-aegis-accent [&_code]:font-mono [&_pre]:bg-aegis-bg/60 [&_pre]:border [&_pre]:border-aegis-border/60 [&_pre]:rounded-lg [&_pre]:p-3 [&_pre]:overflow-x-auto [&_a]:text-aegis-accent [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-aegis-accent/50 [&_blockquote]:pl-3 [&_blockquote]:text-aegis-textDim">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        )}
      </div>

      {!isUser && isLastAssistant && toolCalls.length > 0 && (
        <ToolCallDisplay toolCalls={toolCalls} />
      )}
    </div>
  );
}
