import React from 'react';

interface VoiceStatusBarProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
  partialTranscript: string;
  errorMsg: string | null;
  onStop: () => void;
  onRetryError: () => void;
}

export function VoiceStatusBar({ state, partialTranscript, errorMsg, onStop, onRetryError }: VoiceStatusBarProps) {
  if (state === 'idle') return null;

  if (state === 'error') {
    return (
      <div className="bg-aegis-error/10 border border-aegis-error/30 rounded-xl p-4 flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
        <div className="flex items-center gap-3">
          <span className="text-xl">⚠️</span>
          <div>
            <h3 className="text-sm font-semibold text-aegis-error">Voice Connection Error</h3>
            <p className="text-xs text-aegis-error/80 mt-0.5">{errorMsg || 'Something went wrong.'}</p>
          </div>
        </div>
        <button 
          onClick={onRetryError}
          className="px-4 py-2 bg-aegis-error/20 hover:bg-aegis-error/30 text-aegis-error text-xs font-medium rounded-lg transition-colors border border-aegis-error/30"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="bg-aegis-surface/50 border border-aegis-border rounded-xl p-4 flex flex-col gap-3 animate-in fade-in slide-in-from-bottom-2 backdrop-blur-sm">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {state === 'listening' && (
            <>
              <span className="w-2 h-2 rounded-full bg-aegis-error animate-pulse shadow-[0_0_8px_rgba(239,68,68,0.6)]"></span>
              <span className="text-sm font-medium text-aegis-text">Listening...</span>
            </>
          )}
          {state === 'thinking' && (
            <>
              <span className="w-4 h-4 rounded-full border-2 border-aegis-border border-t-aegis-accent animate-spin"></span>
              <span className="text-sm font-medium text-aegis-text">Processing...</span>
            </>
          )}
          {state === 'speaking' && (
            <>
              <span className="text-lg">🔊</span>
              <span className="text-sm font-medium text-aegis-text">Speaking</span>
            </>
          )}
        </div>

        {state === 'speaking' && (
          <button
            onClick={onStop}
            className="flex items-center gap-1 text-xs px-3 py-1.5 rounded-lg bg-aegis-border/50 hover:bg-aegis-border text-aegis-textDim hover:text-aegis-text transition-colors"
          >
            <span className="w-2 h-2 rounded-[1px] bg-current"></span> Stop
          </button>
        )}
      </div>

      {state === 'listening' && partialTranscript && (
        <div className="pt-2 border-t border-aegis-border/50 text-sm text-aegis-textDim italic">
          "{partialTranscript}"
        </div>
      )}
    </div>
  );
}
