import React from "react";
import { User, Trash2, Sun, Moon, Maximize2, Minimize2 } from "lucide-react";

interface ChatHeaderProps {
  currentUrl?: string;
  activeGoal?: string | null;
  activeAgent?: string | null;
  provider: string;
  theme: "light" | "dark";
  isExpanded?: boolean;
  onToggleTheme: () => void;
  onClearChat: () => void;
  onToggleProfile: () => void;
  onToggleExpand?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentUrl,
  activeGoal,
  activeAgent,
  provider,
  theme,
  isExpanded = false,
  onToggleTheme,
  onClearChat,
  onToggleProfile,
  onToggleExpand
}) => {
  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest("input") || target.closest("select")) {
      return;
    }
    e.preventDefault();
    window.parent.postMessage(
      {
        source: "ai-job-agent-sidebar",
        type: "START_DRAGGING",
        clientX: e.clientX,
        clientY: e.clientY
      },
      "*"
    );
  };

  const shortUrl = currentUrl
    ? currentUrl.replace(/https?:\/\/(www\.)?/, "").split("/")[0]
    : "No active browser tab";

  return (
    <header
      onMouseDown={handleHeaderMouseDown}
      className="flex h-11 items-center justify-between border-b border-[var(--border-color)] bg-[var(--surface-overlay)] px-3 select-none cursor-grab active:cursor-grabbing"
    >
      <div className="flex items-center gap-2 min-w-0">
        <div className="min-w-0">
          <h1 className="text-[13px] font-medium text-[var(--text-primary)] flex items-center gap-1 leading-none">
            Hunter
          </h1>
          <p className="text-[10.5px] text-[var(--text-muted)] font-normal truncate max-w-[150px] mt-0.5" title={currentUrl}>
            {shortUrl}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-1.5">
        {activeGoal && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-md border border-[var(--border-color)] px-2 py-1 text-[10.5px] font-normal text-[var(--text-secondary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)]" />
            {activeAgent || "Agent"}: {activeGoal.length > 15 ? activeGoal.substring(0, 12) + "..." : activeGoal}
          </div>
        )}

        <button
          onClick={onToggleProfile}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex h-7 shrink-0 items-center gap-1 px-2 rounded-md border border-transparent bg-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] text-[11px] font-medium transition cursor-pointer"
          title="Open Profile & Resume Settings"
        >
          <User size={12} />
          <span>Profile</span>
        </button>

        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent bg-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
            title={isExpanded ? "Minimize Chat Window" : "Maximize Chat Window"}
          >
            {isExpanded ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
          </button>
        )}

        <button
          onClick={onToggleTheme}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent bg-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-[var(--text-primary)] transition cursor-pointer"
          title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
        >
          {theme === "dark" ? <Sun size={12} /> : <Moon size={12} />}
        </button>

        <button
          onClick={onClearChat}
          onMouseDown={(e) => e.stopPropagation()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-transparent bg-transparent hover:bg-rose-500/10 text-[var(--text-muted)] hover:text-rose-500 transition cursor-pointer"
          title="Clear active conversation logs"
        >
          <Trash2 size={13} />
        </button>
      </div>
    </header>
  );
};


