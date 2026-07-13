import { User, Trash2, Sun, Moon, Maximize2, Minimize2, PanelLeft, Compass, Settings } from "lucide-react";
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
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentUrl,
  activeGoal,
  activeAgent,
  theme,
  isExpanded = false,
  onToggleTheme,
  onClearChat,
  onToggleProfile,
  onToggleExpand,
  sidebarOpen = false,
  onToggleSidebar
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

  return (
    <header
      onMouseDown={handleHeaderMouseDown}
      className="flex h-14 items-center justify-between border-b border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 select-none cursor-grab active:cursor-grabbing shrink-0"
    >
      {/* Left side: Sidebar toggle, Logo and Brand */}
      <div className="flex items-center gap-3.5 min-w-0">
        {onToggleSidebar && (
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleSidebar}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
            aria-label={sidebarOpen ? "Hide Chat History" : "Show Chat History"}
            title={sidebarOpen ? "Hide Chat History" : "Show Chat History"}
          >
            <PanelLeft size={16} className={sidebarOpen ? "text-[var(--accent)]" : ""} />
          </Button>
        )}

        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--accent-faint)] border border-[var(--accent-dim)] text-[var(--accent)] shadow-sm">
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
            <div className="flex items-center gap-1.5 mt-0.5">
              <span className={`h-1 w-1 rounded-full ${shortUrl ? "bg-emerald-500 animate-pulse" : "bg-zinc-500"}`} />
              <span className="text-[9px] text-[var(--text-muted)] font-medium font-mono uppercase tracking-wider">
                {shortUrl ? "Connected" : "Idle"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side: Page capsule and system control icons */}
      <div className="flex items-center gap-2">
        {activeGoal && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--accent-faint)] px-2.5 py-1 text-[10px] font-medium text-[var(--text-secondary)]">
            <span className="h-1.5 w-1.5 rounded-full bg-[var(--success)] animate-pulse" />
            {activeGoal.length > 18 ? activeGoal.substring(0, 16) + "..." : activeGoal}
          </div>
        )}
        {shortUrl && (
          <div className="hidden md:flex items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-tertiary)] px-2.5 py-1 text-[10px] font-mono text-[var(--text-secondary)] shadow-sm max-w-[150px]">
            <span className="truncate" title={currentUrl}>{shortUrl}</span>
          </div>
        )}

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleProfile}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
            aria-label="Profile & Resume Settings"
            title="Profile & Resume Settings"
          >
            <User size={16} />
          </Button>

          {onToggleExpand && (
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleExpand}
              onMouseDown={(e) => e.stopPropagation()}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
              aria-label={isExpanded ? "Minimize Chat Window" : "Maximize Chat Window"}
              title={isExpanded ? "Minimize Chat Window" : "Maximize Chat Window"}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Button>
          )}

          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleTheme}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-transparent hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer"
            aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={onClearChat}
            onMouseDown={(e) => e.stopPropagation()}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-transparent hover:bg-rose-500/10 text-[var(--text-secondary)] hover:text-rose-500 transition cursor-pointer"
            aria-label="Clear active conversation logs"
            title="Clear active conversation logs"
          >
            <Trash2 size={16} />
          </Button>
        </div>
      </div>
    </header>
  );
};
