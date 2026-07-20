import type React from "react";
import { User, Trash2, Sun, Moon, Maximize2, Minimize2, Compass, History, Plus } from "lucide-react";
import { Button } from "../ui/button";
import PlugConnectedIcon from "../ui/icons/plug-connected-icon";

interface ChatHeaderProps {
  currentUrl?: string;
  activeGoal?: string | null;
  activeAgent?: string | null;
  provider?: string;
  theme: "light" | "dark";
  isExpanded?: boolean;
  onToggleTheme: () => void;
  onClearChat: () => void;
  onToggleProfile: () => void;
  onToggleExpand?: () => void;
  onOpenHistory?: () => void;
  onNewChat?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentUrl,
  activeGoal,
  theme,
  isExpanded = false,
  onToggleTheme,
  onClearChat,
  onToggleProfile,
  onToggleExpand,
  onOpenHistory,
  onNewChat
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
    : null;

  const handleClear = () => {
    onClearChat();
  };

  return (
    <header
      onMouseDown={handleHeaderMouseDown}
      className="flex h-14 items-center justify-between border-b border-[var(--border-color)] bg-[var(--surface-overlay)] px-3 select-none cursor-grab active:cursor-grabbing shrink-0 shadow-sm"
    >
      {/* Left: Brand */}
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)] shadow-sm shrink-0">
            {shortUrl ? (
              <PlugConnectedIcon size={16} />
            ) : (
              <Compass size={16} className="animate-spin-slow" style={{ animationDuration: "12s" }} />
            )}
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-[12.5px] font-bold tracking-wider text-[var(--text-primary)] font-mono leading-none">
               HUNTER
            </h1>
            <div className="flex items-center gap-1.5 mt-0.5 min-w-0">
              <span className={`h-1 w-1 rounded-full shrink-0 ${shortUrl ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`} />
              <span className="text-[9px] text-[var(--text-muted)] font-medium font-mono uppercase tracking-wider truncate max-w-[120px]" title={currentUrl}>
                {shortUrl || "Idle"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 shrink-0">
        {activeGoal && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2 py-1 text-[9px] font-medium text-[var(--text-secondary)] max-w-[100px]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse shrink-0" />
            <span className="truncate">{activeGoal.length > 14 ? activeGoal.substring(0, 12) + "…" : activeGoal}</span>
          </div>
        )}

        <div className="flex items-center gap-0.5">
          {onNewChat && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onNewChat}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent hover:border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              aria-label="New conversation"
              title="New conversation"
            >
              <Plus size={15} />
            </Button>
          )}

          {onOpenHistory && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onOpenHistory}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent hover:border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              aria-label="Conversation history"
              title="Conversation history"
            >
              <History size={15} />
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleProfile}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent hover:border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
            aria-label="Profile & Resume Settings"
            title="Profile & Resume Settings"
          >
            <User size={15} />
          </Button>

          {onToggleExpand && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleExpand}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent hover:border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              aria-label={isExpanded ? "Minimize Chat Window" : "Maximize Chat Window"}
              title={isExpanded ? "Minimize Chat Window" : "Maximize Chat Window"}
            >
              {isExpanded ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent hover:border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={handleClear}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-transparent hover:border-rose-500/30 bg-transparent hover:bg-rose-500/10 text-[var(--text-secondary)] hover:text-rose-500 transition cursor-pointer"
            aria-label="Clear active conversation"
            title="Clear messages"
          >
            <Trash2 size={15} />
          </Button>
        </div>
      </div>
    </header>
  );
};
