import React from "react";
import { Bot, Sparkles, Activity, ShieldAlert, Cpu, Database } from "lucide-react";

interface ChatHeaderProps {
  currentUrl?: string;
  activeGoal?: string | null;
  activeAgent?: string | null;
  provider: string;
  devMode: boolean;
  onToggleDevMode: () => void;
  onToggleSidebar: () => void;
  onClearChat: () => void;
}

export const ChatHeader: React.FC<ChatHeaderProps> = ({
  currentUrl,
  activeGoal,
  activeAgent,
  provider,
  devMode,
  onToggleDevMode,
  onToggleSidebar,
  onClearChat
}) => {
  const shortUrl = currentUrl
    ? currentUrl.replace(/https?:\/\/(www\.)?/, "").split("/")[0]
    : "No active browser tab";

  return (
    <header className="flex h-13 items-center justify-between border-b border-[rgba(255,255,255,0.08)] bg-[#111111]/90 px-4 py-2.5 backdrop-blur-md select-none">
      <div className="flex items-center gap-2.5 min-w-0">
        <button
          onClick={onToggleSidebar}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[rgba(255,255,255,0.08)] bg-[#1a1a1a] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800 transition cursor-pointer"
          title="Toggle Conversations List"
        >
          <Bot size={15} className="text-[#ff6b35] animate-pulse" />
        </button>
        <div className="min-w-0">
          <h1 className="text-xs font-bold text-zinc-200 flex items-center gap-1 leading-none">
            HUNTERR <span className="text-[9px] font-normal px-1 rounded bg-[#ff6b35]/20 text-[#ff6b35]">V15</span>
          </h1>
          <p className="text-[10px] text-zinc-500 font-medium truncate max-w-[150px] mt-0.5" title={currentUrl}>
            {shortUrl}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {activeGoal && (
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-emerald-950/20 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" />
            {activeAgent || "Agent"}: {activeGoal.length > 15 ? activeGoal.substring(0, 12) + "..." : activeGoal}
          </div>
        )}

        <button
          onClick={onToggleDevMode}
          className={`flex h-8 items-center gap-1 px-2.5 rounded-lg border text-[10px] font-bold transition cursor-pointer ${
            devMode
              ? "border-[#ff6b35] bg-[#ff6b35]/15 text-[#ff6b35]"
              : "border-[rgba(255,255,255,0.08)] bg-[#1a1a1a] text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800"
          }`}
          title="Toggle Developer panel"
        >
          <Cpu size={12} />
          <span>Dev</span>
        </button>

        <button
          onClick={onClearChat}
          className="h-8 px-2.5 rounded-lg border border-rose-900/30 bg-[#1a1a1a] hover:bg-rose-950/25 hover:border-rose-800 text-zinc-400 hover:text-rose-400 text-[10px] font-medium transition cursor-pointer"
          title="Clear active conversation logs"
        >
          Reset
        </button>
      </div>
    </header>
  );
};
