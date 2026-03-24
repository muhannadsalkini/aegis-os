"use client";

import { useState } from "react";
import { ChevronDown, ChevronRight, Wrench, Zap } from "lucide-react";
import { ToolCall } from "../types";

interface ToolCallDisplayProps {
  toolCalls: ToolCall[];
}

export function ToolCallDisplay({ toolCalls }: ToolCallDisplayProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (toolCalls.length === 0) return null;

  return (
    <div className="max-w-[80%] w-full mt-2">
      <button
        type="button"
        onClick={() => setIsOpen((v) => !v)}
        aria-expanded={isOpen}
        className={`w-full flex items-center justify-between gap-3 px-3 py-2 border border-aegis-border/60 bg-aegis-surface/40 rounded-xl hover:border-aegis-accent/60 transition-colors ${
          !isOpen ? "tool-pulse" : ""
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
          {isOpen ? (
            <ChevronDown className="w-4 h-4 text-aegis-textDim" aria-hidden="true" />
          ) : (
            <ChevronRight className="w-4 h-4 text-aegis-textDim" aria-hidden="true" />
          )}
        </span>
      </button>

      {isOpen && (
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
  );
}
