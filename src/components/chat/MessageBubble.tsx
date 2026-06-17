import React, { useState } from "react";
import { Copy, Check, RotateCw, Edit2, Play, User, Bot, AlertCircle, Cpu } from "lucide-react";
import { Markdown } from "../../shared/components/Markdown";
import { ImageBubble } from "./ImageBubble";
import type { ChatMessage, MessageRole } from "../../chat/ChatTypes";

interface MessageBubbleProps {
  message: ChatMessage;
  onCopy: (text: string) => void;
  onRegenerate?: (id: string) => void;
  onEditAndRetry?: (id: string, newText: string) => void;
  isGenerating?: boolean;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onCopy,
  onRegenerate,
  onEditAndRetry,
  isGenerating
}) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      onCopy(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy message:", err);
    }
  };

  const handleSaveEdit = () => {
    if (onEditAndRetry && editText.trim() !== message.content.trim()) {
      onEditAndRetry(message.id, editText);
    }
    setIsEditing(false);
  };

  const isUser = message.role === "user";
  const isAssistant = message.role === "assistant" || message.role === "vision";
  const isError = message.role === "error";
  const isThinking = message.role === "thinking";
  const isLog = message.role === "system" || message.role === "tool" || message.role === "agent" || message.role === "progress";

  if (isLog) {
    return (
      <div className="flex justify-center my-2 select-none animate-fade-in">
        <div className="rounded-full bg-zinc-900/60 border border-[rgba(255,255,255,0.04)] px-3 py-1 text-[10.5px] font-mono text-zinc-500 font-medium">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex gap-3 px-4 py-3 transition-all duration-200 animate-fade-in ${
        isUser ? "bg-transparent flex-row-reverse" : "bg-[var(--bg-secondary)] border-y border-[var(--border-color)]"
      }`}
    >
      {/* Icon Avatar */}
      <div className="shrink-0 select-none">
        {isUser ? (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-zinc-850 text-zinc-300 font-semibold text-xs border border-zinc-800">
            <User size={13} />
          </div>
        ) : (
          <div className={`flex h-7 w-7 items-center justify-center rounded-full border bg-[#ff6b35]/10 border-[#ff6b35]/25 text-[#ff6b35] animate-scale-up`}>
            {isError ? <AlertCircle size={13} /> : <Bot size={13} />}
          </div>
        )}
      </div>

      {/* Content wrapper */}
      <div className={`flex-1 min-w-0 max-w-2xl space-y-1.5 flex flex-col ${isUser ? "items-end" : "items-start"}`}>
        {/* Header Details */}
        <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-zinc-500 select-none">
          <span>{isUser ? "You" : "Hunter"}</span>
          <span className="text-[9.5px] font-medium opacity-50">•</span>
          <span className="text-[9.5px] font-medium opacity-55">
            {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </span>
          {message.metadata?.model && (
            <>
              <span className="text-[9.5px] font-medium opacity-50">•</span>
              <span className="flex items-center gap-0.5 text-[9px] text-zinc-500 bg-[var(--bg-tertiary)] px-1.5 py-0.5 rounded border border-[var(--border-color)]">
                <Cpu size={9} />
                {message.metadata.provider}: {message.metadata.model.replace("models/", "")}
              </span>
            </>
          )}
        </div>

        {/* Text / Markdown Render within speech bubble */}
        <div className={`rounded-2xl px-4 py-2.5 text-[12.5px] leading-relaxed font-sans select-text max-w-lg shadow-sm border ${
          isUser 
            ? "user-bubble text-left" 
            : isError 
            ? "bg-rose-955/15 border-rose-900/30 text-rose-400 text-left font-mono text-[11px]" 
            : "assistant-bubble text-left text-zinc-300"
        }`}>
          {isEditing ? (
            <div className="space-y-2 text-left mt-1 min-w-[220px]">
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full min-h-[70px] rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-2.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-[#ff6b35]"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setIsEditing(false)}
                  className="px-2.5 py-1 rounded border border-zinc-800 text-[10.5px] text-zinc-450 hover:text-zinc-200 transition cursor-pointer bg-transparent"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-2.5 py-1 rounded bg-[#ff6b35] hover:bg-[#ff8255] text-black font-semibold text-[10.5px] transition cursor-pointer"
                >
                  Save & Retry
                </button>
              </div>
            </div>
          ) : isThinking ? (
            <div className="flex items-center gap-1.5 select-none font-medium italic text-zinc-500 py-1">
              <span className="bounce-dot bg-zinc-500" />
              <span>{message.content || "Hunter is thinking..."}</span>
            </div>
          ) : (
            <div className="markdown-wrapper">
              <Markdown content={message.content} />
            </div>
          )}
        </div>

        {/* Attachments (e.g. uploaded images or screenshots) */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex flex-wrap gap-2.5 mt-1">
            {message.attachments.map((att) => (
              <ImageBubble key={att.id} attachment={att} />
            ))}
          </div>
        )}

        {/* Vision Detection Element card if returned inside message bubble directly */}
        {message.metadata?.detectedElements && message.metadata.detectedElements.length > 0 && !message.attachments && (
          <div className="mt-1.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3 text-[11px] font-mono max-w-sm">
            <div className="text-zinc-500 font-bold mb-1">Confidence: {message.metadata.confidence ? `${Math.round(message.metadata.confidence * 100)}%` : "92%"}</div>
            <div className="text-zinc-455">
              Interactive page controls detected:
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-[10px] text-zinc-500">
                {message.metadata.detectedElements.slice(0, 3).map((el: any, i: number) => (
                  <li key={i} className="truncate">• {el.text} ({el.type})</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Action Controls Footer */}
        {!isEditing && !isThinking && (
          <div className="flex items-center gap-3 pt-1 select-none">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 text-[10px] font-medium text-zinc-550 hover:text-zinc-350 transition cursor-pointer"
              title="Copy response"
            >
              {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>

            {isUser && onEditAndRetry && !isGenerating && (
              <button
                onClick={() => setIsEditing(true)}
                className="flex items-center gap-1 text-[10px] font-medium text-zinc-550 hover:text-zinc-350 transition cursor-pointer"
                title="Edit Prompt"
              >
                <Edit2 size={11} />
                <span>Edit</span>
              </button>
            )}

            {isAssistant && onRegenerate && !isGenerating && (
              <button
                onClick={() => onRegenerate(message.id)}
                className="flex items-center gap-1 text-[10px] font-medium text-zinc-550 hover:text-zinc-350 transition cursor-pointer"
                title="Regenerate this response"
              >
                <RotateCw size={11} />
                <span>Regenerate</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
