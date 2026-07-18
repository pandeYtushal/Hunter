import React from "react";
import { Bot } from "lucide-react";

interface TypingIndicatorProps {
  /** Optional status line under the dots (e.g. vision analysis). */
  label?: string;
  /** Hide the avatar row when embedded inside an existing message. */
  compact?: boolean;
}

/**
 * Claude / ChatGPT style "thinking" indicator — no bordered box.
 * Soft avatar pulse rings + staggered wave dots.
 */
export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  label,
  compact = false
}) => {
  const dots = (
    <div className="hunter-thinking-dots" aria-hidden>
      <span className="hunter-thinking-dot" />
      <span className="hunter-thinking-dot" />
      <span className="hunter-thinking-dot" />
    </div>
  );

  if (compact) {
    return (
      <div className="flex flex-col items-start gap-1.5 py-0.5 select-none animate-fade-in">
        {dots}
        {label ? (
          <span className="text-[11px] font-medium text-[var(--text-muted)] animate-shimmer-soft">
            {label}
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="w-full py-2.5 animate-fade-in select-none"
      role="status"
      aria-live="polite"
      aria-label={label || "Hunter is thinking"}
    >
      <div className="max-w-full w-full mx-auto px-1 flex gap-3.5 flex-row">
        <div className="shrink-0">
          <div className="hunter-avatar-live flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-secondary)] shadow-sm">
            <Bot size={14} />
          </div>
        </div>

        <div className="flex-grow min-w-0 flex flex-col items-start space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted)] font-sans">
            <span>Hunter</span>
            <span className="text-[10px] font-medium opacity-70 font-normal">thinking</span>
          </div>
          {dots}
          {label ? (
            <span className="text-[11px] font-medium text-[var(--text-muted)] animate-shimmer-soft max-w-[280px]">
              {label}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
};
