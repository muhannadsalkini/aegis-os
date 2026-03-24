import React from 'react';

interface MicButtonProps {
  state: 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';
  onClick: () => void;
  disabled?: boolean;
}

export function MicButton({ state, onClick, disabled }: MicButtonProps) {
  const getStyles = () => {
    if (disabled || state === 'thinking') {
      return 'bg-aegis-surface border-aegis-border text-aegis-textDim opacity-50 cursor-not-allowed';
    }
    
    switch (state) {
      case 'idle':
      case 'error':
        return 'bg-aegis-surface border-aegis-border hover:border-aegis-accent/50 hover:text-aegis-accent text-aegis-textDim transition-colors';
      case 'listening':
        return 'bg-aegis-error/20 border-aegis-error text-aegis-error animate-pulse shadow-[0_0_15px_rgba(239,68,68,0.3)]';
      case 'speaking':
        return 'bg-aegis-accent/20 border-aegis-accent text-aegis-accent';
      default:
        return 'bg-aegis-surface border-aegis-border';
    }
  };

  const getIcon = () => {
    switch (state) {
      case 'idle':
      case 'error':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
          </svg>
        );
      case 'listening':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
            <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
          </svg>
        );
      case 'thinking':
        return (
          <div className="flex gap-1 justify-center items-center w-5 h-5">
            <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.3s]"></span>
            <span className="w-1 h-1 rounded-full bg-current animate-bounce [animation-delay:-0.15s]"></span>
            <span className="w-1 h-1 rounded-full bg-current animate-bounce"></span>
          </div>
        );
      case 'speaking':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
          </svg>
        );
    }
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || state === 'thinking'}
      type="button"
      title="Voice mode"
      className={`p-3 rounded-xl border flex items-center justify-center min-w-[3rem] min-h-[3rem] ${getStyles()}`}
    >
      {getIcon()}
    </button>
  );
}
