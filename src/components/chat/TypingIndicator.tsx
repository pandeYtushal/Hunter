import React from "react";
import { Bot } from "lucide-react";

export const TypingIndicator: React.FC = () => {
  return (
    <div className="w-full py-3 animate-fade-in">
      <div className="max-w-3xl w-full mx-auto flex gap-4 items-start">
        {/* Icon Avatar */}
        <div className="shrink-0 select-none">
          <div className="assistant-avatar flex h-7 w-7 items-center justify-center rounded-full border shadow-inner">
            <Bot size={13} />
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="flex-1 min-w-0 flex flex-col items-start space-y-1.5">
          {/* Header Details */}
          <div className="flex items-center gap-2 text-[10px] font-bold text-[var(--text-muted)] tracking-wider uppercase font-mono select-none">
            <span>Hunter</span>
            <span className="text-[var(--text-muted)] opacity-60 font-normal">/</span>
            <span className="text-[9.5px] font-medium lowercase font-sans opacity-85">
              thinking...
            </span>
          </div>

          {/* Bouncing dots wrapper */}
          <div className="flex gap-1.5 items-center py-2 px-1 select-none">
            <span className="bounce-dot bg-[var(--text-muted)] w-1.5 h-1.5 rounded-full" />
            <span className="bounce-dot bg-[var(--text-muted)]/80 w-1.5 h-1.5 rounded-full" />
            <span className="bounce-dot bg-[var(--text-muted)]/60 w-1.5 h-1.5 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  );
};
