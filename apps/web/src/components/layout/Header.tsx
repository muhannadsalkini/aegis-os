"use client";

import { BookOpen, Zap, LogOut } from "lucide-react";
import { useAuth } from "@/components/providers/AuthProvider";

interface HeaderProps {
  onClearChat: () => void;
  isClearDisabled: boolean;
  voicePill?: React.ReactNode;
}

export function Header({ onClearChat, isClearDisabled, voicePill }: HeaderProps) {
  const { user, signOut } = useAuth();

  return (
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
          {user && (
            <span className="hidden sm:block text-xs text-aegis-textDim truncate max-w-[160px]">
              {user.email}
            </span>
          )}
          <a
            href="/knowledge"
            className="px-3 py-1.5 text-xs rounded-md bg-aegis-accent/10 hover:bg-aegis-accent/20 text-aegis-accent border border-aegis-accent/30 hover:border-aegis-accent/50 transition-colors flex items-center gap-1.5"
          >
            <BookOpen className="w-4 h-4" aria-hidden="true" />
            <span>Knowledge</span>
          </a>
          <button
            onClick={onClearChat}
            disabled={isClearDisabled}
            className="px-3 py-1.5 text-xs rounded-md bg-aegis-border hover:bg-aegis-border/80 text-aegis-textDim hover:text-aegis-text transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Clear
          </button>
          <button
            onClick={signOut}
            title="Sign Out"
            className="px-2 py-1.5 text-xs rounded-md bg-aegis-border hover:bg-aegis-error/20 text-aegis-textDim hover:text-aegis-error transition-colors flex items-center gap-1.5"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    </header>
  );
}
