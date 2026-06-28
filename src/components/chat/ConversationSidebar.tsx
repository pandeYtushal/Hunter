import React from "react";
import { Plus, MessageSquare, Trash2, X } from "lucide-react";
import type { ChatConversation } from "../../chat/ChatTypes";

interface ConversationSidebarProps {
  conversations: ChatConversation[];
  activeId: string | null;
  isOpen: boolean;
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeId,
  isOpen,
  onSelect,
  onCreate,
  onDelete,
  onClose
}) => {
  console.log("ConversationSidebar rendering. isOpen:", isOpen, "conversations count:", conversations.length);
  if (!isOpen) return null;

  return (
    <div className="absolute inset-0 z-50 flex select-none">
      <button
        type="button"
        aria-label="Close conversations"
        onClick={(e) => {
          if (e.target === e.currentTarget) {
            onClose();
          }
        }}
        className="absolute inset-0 bg-black/40 cursor-default animate-fade-in"
      />

      <aside className="relative z-10 flex h-full w-[min(82vw,18rem)] flex-col border-r border-[var(--border-color)] bg-[var(--bg-secondary)] shadow-2xl animate-msg-left">
        <div className="p-3.5 border-b border-[var(--border-color)] flex justify-between items-center bg-[var(--bg-primary)]/70">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[var(--text-secondary)]">Conversations</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--text-muted)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition cursor-pointer"
          >
            <X size={14} />
          </button>
        </div>

        <div className="p-2.5">
          <button
            type="button"
            onClick={onCreate}
            className="w-full flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[var(--accent)] hover:opacity-90 text-white font-bold text-xs transition cursor-pointer shadow-sm"
          >
            <Plus size={14} />
            New Chat
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1 custom-scrollbar">
          {conversations.length === 0 ? (
            <div className="text-[11px] text-[var(--text-muted)] text-center py-6 italic">No conversations yet</div>
          ) : (
            conversations.map((c) => {
              const isActive = c.id === activeId;
              return (
                <div
                  key={c.id}
                  onClick={() => onSelect(c.id)}
                  className={`group flex items-center justify-between rounded-lg p-2.5 cursor-pointer text-left border transition-all duration-200 ${
                    isActive
                      ? "bg-[var(--bg-tertiary)] border-[var(--border-color)] text-[var(--text-primary)]"
                      : "bg-transparent border-transparent hover:bg-[var(--bg-tertiary)] hover:border-[var(--border-color)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <MessageSquare size={13} className="shrink-0 text-[var(--text-muted)] group-hover:text-[var(--accent)] transition-colors duration-200" />
                    <span className="truncate text-xs font-semibold leading-normal">{c.title}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(c.id);
                    }}
                    className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-[var(--bg-secondary)] text-[var(--text-muted)] hover:text-rose-500 transition shrink-0 cursor-pointer ml-1.5"
                    title="Delete conversation"
                  >
                    <Trash2 size={11} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </aside>
    </div>
  );
};
