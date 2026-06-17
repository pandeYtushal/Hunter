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
  if (!isOpen) return null;

  return (
    <aside className="w-64 border-r border-[rgba(255,255,255,0.08)] bg-[#0c0c0c] flex flex-col h-full shrink-0 select-none animate-fade-in">
      <div className="p-3.5 border-b border-[rgba(255,255,255,0.08)] flex justify-between items-center bg-[#090909]">
        <h2 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Conversations</h2>
        <button
          onClick={onClose}
          className="p-1 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition cursor-pointer"
        >
          <X size={14} />
        </button>
      </div>

      <div className="p-2.5">
        <button
          onClick={onCreate}
          className="w-full flex h-9 items-center justify-center gap-1.5 rounded-lg bg-[#ff6b35] hover:bg-[#ff8255] text-black font-semibold text-xs transition cursor-pointer shadow-sm"
        >
          <Plus size={14} />
          New Chat
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-2 space-y-1 py-1 custom-scrollbar">
        {conversations.length === 0 ? (
          <div className="text-[11px] text-zinc-600 text-center py-6 italic">No conversations yet</div>
        ) : (
          conversations.map((c) => {
            const isActive = c.id === activeId;
            return (
              <div
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`group flex items-center justify-between rounded-lg p-2.5 cursor-pointer text-left transition ${
                  isActive
                    ? "bg-zinc-800/80 border border-zinc-700/50 text-zinc-100"
                    : "hover:bg-zinc-900/60 border border-transparent text-zinc-400 hover:text-zinc-200"
                }`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <MessageSquare size={13} className="shrink-0 text-zinc-500 group-hover:text-zinc-400" />
                  <span className="truncate text-xs font-medium leading-normal">{c.title}</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(c.id);
                  }}
                  className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-zinc-800 text-zinc-500 hover:text-rose-400 transition shrink-0 cursor-pointer ml-1.5"
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
  );
};
