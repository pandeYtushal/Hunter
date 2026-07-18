import React from "react";
import { History, Plus, Pin, Trash2, X, MessageSquare } from "lucide-react";
import type { ChatConversation } from "../../chat/ChatTypes";
import { Button } from "../ui/button";

interface ConversationHistoryProps {
  open: boolean;
  conversations: ChatConversation[];
  activeId: string | null;
  onClose: () => void;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string) => void;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "";
    const diffMs = Date.now() - d.getTime();
    const mins = Math.floor(diffMs / 60000);
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  } catch {
    return "";
  }
}

function previewTitle(conv: ChatConversation): string {
  if (conv.title && conv.title !== "New Conversation") return conv.title;
  const firstUser = conv.messages.find((m) => m.role === "user");
  if (firstUser?.content?.trim()) {
    const text = firstUser.content.trim().replace(/\s+/g, " ");
    return text.length > 48 ? text.slice(0, 46) + "…" : text;
  }
  return "New conversation";
}

export const ConversationHistory: React.FC<ConversationHistoryProps> = ({
  open,
  conversations,
  activeId,
  onClose,
  onSelect,
  onCreate,
  onDelete,
  onTogglePin
}) => {
  if (!open) return null;

  const sorted = [...conversations].sort((a, b) => {
    if (a.pinned && !b.pinned) return -1;
    if (!a.pinned && b.pinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  return (
    <>
      <div
        className="absolute inset-0 z-40 bg-black/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="absolute inset-y-0 left-0 z-50 flex w-[min(100%,300px)] flex-col border-r border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-xl animate-fade-in"
        role="dialog"
        aria-label="Conversation history"
      >
        <div className="flex h-14 items-center justify-between border-b border-[var(--border-color)] px-3 shrink-0">
          <div className="flex items-center gap-2 text-[var(--text-primary)]">
            <History size={15} className="text-[var(--accent)]" />
            <span className="text-[12px] font-bold tracking-wide uppercase font-mono">History</span>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                onCreate();
                onClose();
              }}
              className="h-8 w-8 rounded-lg border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              title="New conversation"
              aria-label="New conversation"
            >
              <Plus size={15} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              aria-label="Close history"
            >
              <X size={15} />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-1">
          {sorted.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-2 py-12 text-center px-4">
              <MessageSquare size={22} className="text-[var(--text-muted)] opacity-50" />
              <p className="text-[12px] text-[var(--text-muted)]">No conversations yet</p>
            </div>
          ) : (
            sorted.map((conv) => {
              const isActive = conv.id === activeId;
              const msgCount = conv.messages?.length ?? 0;
              return (
                <div
                  key={conv.id}
                  className={`group relative flex items-start gap-2 rounded-xl border px-2.5 py-2.5 transition cursor-pointer ${
                    isActive
                      ? "border-[var(--accent-dim)] bg-[var(--accent-faint)]"
                      : "border-transparent hover:border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]"
                  }`}
                  onClick={() => {
                    onSelect(conv.id);
                    onClose();
                  }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(conv.id);
                      onClose();
                    }
                  }}
                >
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-primary)] text-[var(--text-muted)]">
                    {conv.pinned ? (
                      <Pin size={12} className="text-[var(--accent)]" />
                    ) : (
                      <MessageSquare size={12} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12px] font-semibold text-[var(--text-primary)] truncate leading-snug">
                      {previewTitle(conv)}
                    </p>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 font-mono">
                      {formatRelativeTime(conv.updatedAt)}
                      {msgCount > 0 ? ` · ${msgCount} msg` : ""}
                    </p>
                  </div>
                  <div
                    className="flex shrink-0 flex-col gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <button
                      type="button"
                      onClick={() => onTogglePin(conv.id)}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] hover:text-[var(--accent)] hover:bg-[var(--bg-primary)] border-0 bg-transparent cursor-pointer"
                      title={conv.pinned ? "Unpin" : "Pin"}
                      aria-label={conv.pinned ? "Unpin conversation" : "Pin conversation"}
                    >
                      <Pin size={12} className={conv.pinned ? "fill-current text-[var(--accent)]" : ""} />
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm("Delete this conversation?")) {
                          onDelete(conv.id);
                        }
                      }}
                      className="flex h-6 w-6 items-center justify-center rounded-md text-[var(--text-muted)] hover:text-rose-500 hover:bg-rose-500/10 border-0 bg-transparent cursor-pointer"
                      title="Delete"
                      aria-label="Delete conversation"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </>
  );
};
