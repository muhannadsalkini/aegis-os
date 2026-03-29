import { useState } from "react";
import { Message, ToolCall, ChatUsage, ChatCostInfo } from "../types";

export function useChatStream(apiUrl: string, getAccessToken: () => Promise<string | null>) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [toolCalls, setToolCalls] = useState<ToolCall[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [usage, setUsage] = useState<ChatUsage | null>(null);
  const [costInfo, setCostInfo] = useState<ChatCostInfo | null>(null);

  const clearChat = () => {
    setMessages([]);
    setToolCalls([]);
    setError(null);
    setUsage(null);
    setCostInfo(null);
  };

  const sendMessage = async (input: string) => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = { role: "user", content: input.trim() };
    const newMessages = [...messages, userMessage];

    // Add user message + an empty assistant placeholder immediately
    setMessages([...newMessages, { role: "assistant", content: "" }]);
    setIsLoading(true);
    setError(null);
    setToolCalls([]);

    try {
      // Get the JWT access token for authentication
      const token = await getAccessToken();
      console.log('[useChatStream] Token obtained:', token ? `${token.substring(0, 20)}...` : 'NULL');
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${apiUrl}/agents/chat/stream`, {
        method: "POST",
        headers,
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

  return {
    messages,
    setMessages,
    isLoading,
    toolCalls,
    setToolCalls,
    error,
    setError,
    usage,
    setUsage,
    costInfo,
    setCostInfo,
    sendMessage,
    clearChat,
  };
}
