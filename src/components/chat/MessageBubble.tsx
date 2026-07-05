import React, { useState, useRef, useEffect } from "react";
import { Copy, Check, RotateCw, Edit2, User, Bot, AlertCircle } from "lucide-react";
import { Markdown } from "../../shared/components/Markdown";
import { ImageBubble } from "./ImageBubble";
import type { ChatMessage } from "../../chat/ChatTypes";

interface MessageBubbleProps {
  message: ChatMessage;
  onCopy: (text: string) => void;
  onRegenerate?: (id: string) => void;
  onEditAndRetry?: (id: string, newText: string) => void;
  isGenerating?: boolean;
}

const _MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onCopy,
  onRegenerate,
  onEditAndRetry,
  isGenerating
}) => {
  // Runtime Guard: Ensure message.content is always a string to prevent React Error #31
  if (message && typeof message.content !== "string") {
    console.error("Invalid React child detected: message.content is not a string", message.content, typeof message.content);
    try {
      message.content = typeof message.content === "object" ? JSON.stringify(message.content) : String(message.content);
    } catch (e) {
      message.content = "[Unrenderable Content]";
    }
  }

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editText, setEditText] = useState(message.content);
  const [isLastAssistant, setIsLastAssistant] = useState(false);
  
  const bubbleRef = useRef<HTMLDivElement>(null);

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

  // Check if this bubble is the last assistant bubble while generating
  useEffect(() => {
    if (!isGenerating || isUser || isLog || isThinking) {
      setIsLastAssistant(false);
      return;
    }

    const container = bubbleRef.current?.parentElement;
    if (container) {
      const assistantRows = container.querySelectorAll(".assistant-row");
      if (assistantRows.length > 0) {
        const lastAssistant = assistantRows[assistantRows.length - 1];
        setIsLastAssistant(lastAssistant === bubbleRef.current);
      }
    }
  }, [isGenerating, isUser, isLog, isThinking]);

  if (isLog) {
    return (
      <div className="flex justify-center my-2 select-none animate-fade-in">
        <div className="rounded-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] px-3 py-1.5 text-[11px] font-mono text-[var(--text-muted)] font-semibold shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div
      ref={bubbleRef}
      className={`w-full py-2 transition-all duration-200 animate-fade-in group ${
        isUser ? "user-row" : "assistant-row border-b border-[var(--border-color)]"
      }`}
    >
      <div className={`max-w-full w-full mx-auto px-3 flex gap-4 ${
        isUser ? "flex-row-reverse" : "flex-row"
      }`}>
        
        {/* Icon Avatar */}
        <div className="shrink-0 select-none">
          {isUser ? (
            <div className="user-avatar flex h-7 w-7 items-center justify-center rounded-full border font-semibold text-xs shadow-sm">
              <User size={13} />
            </div>
          ) : (
            <div className={`flex h-7 w-7 items-center justify-center rounded-full border ${
              isError 
                ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/30 dark:border-rose-500/30 dark:text-rose-400" 
                : "assistant-avatar"
            } shadow-sm`}>
              {isError ? <AlertCircle size={13} /> : <Bot size={13} />}
            </div>
          )}
        </div>

        {/* Content Wrapper */}
        <div className={`flex-1 min-w-0 flex flex-col ${isUser ? "items-end" : "items-start"} space-y-1.5`}>
          
          {/* Header Details */}
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[var(--text-muted)] select-none">
            <span>{isUser ? "You" : "Hunter"}</span>
            <span className="text-[var(--text-muted)] opacity-50 font-normal">/</span>
            <span className="text-[11px] font-medium lowercase font-sans opacity-85">
              {new Date(message.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
            </span>
          </div>

          {/* Text / Markdown bubble */}
          {isUser ? (
            /* User Speech Bubble style (ChatGPT desktop style user bubble) */
            <div className="user-message-bubble w-fit max-w-[min(88%,34rem)] rounded-[20px] rounded-tr-[6px] border px-3 py-2 shadow-sm text-[13.5px] leading-relaxed text-left whitespace-pre-wrap select-text">
              {isEditing ? (
                <div className="space-y-2 mt-1 min-w-[240px]">
                  <textarea
                    value={editText}
                    onChange={(e) => setEditText(e.target.value)}
                    className="w-full min-h-[70px] rounded-xl border border-[var(--border-color)] bg-[var(--bg-primary)] p-2.5 text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--text-muted)] focus:ring-1 focus:ring-[var(--border-hover)]/20"
                  />
                  <div className="flex gap-2 justify-end">
                    <button
                      onClick={() => setIsEditing(false)}
                      className="px-2.5 py-1 rounded-lg border border-[var(--border-color)] text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition cursor-pointer bg-transparent"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleSaveEdit}
                      className="px-2.5 py-1 rounded-lg bg-[var(--text-primary)] text-[var(--bg-primary)] hover:opacity-90 font-semibold text-[11px] transition cursor-pointer"
                    >
                      Save & Retry
                    </button>
                  </div>
                </div>
              ) : (
                message.content
              )}
            </div>
          ) : (
            /* Assistant Open Style (No border bubble wrapper, flows naturally) */
            <div className="w-full text-[var(--text-primary)] text-[13.5px] leading-relaxed text-left select-text">
              {isThinking ? (
                <div className="flex items-center gap-2 select-none font-medium italic text-[var(--text-muted)] py-1">
                  <span className="bounce-dot bg-[var(--text-muted)]" />
                  <span>{message.content || "Hunter is thinking..."}</span>
                </div>
              ) : isError ? (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/30 rounded-xl text-red-600 dark:text-red-400 font-mono text-[11.5px] leading-relaxed max-w-xl">
                  {message.content}
                </div>
              ) : (
                 <div className="markdown-container">
                  <Markdown content={String(message.content ?? "")} isStreaming={isLastAssistant} />
                </div>
              )}
            </div>
          )}

          {/* Attachments (e.g. uploaded images or screenshots) */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-1.5">
              {message.attachments.map((att) => (
                <ImageBubble key={att.id} attachment={att} />
              ))}
            </div>
          )}

          {/* Vision Detection Element card */}
          {message.metadata?.detectedElements && message.metadata.detectedElements.length > 0 && !message.attachments && (
            <div className="mt-2 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)]/50 p-3 text-[11px] font-mono max-w-md w-full">
              <div className="text-[var(--text-muted)] font-bold mb-1 select-none">Confidence: {message.metadata.confidence ? `${Math.round(message.metadata.confidence * 100)}%` : "92%"}</div>
              <div className="text-[var(--text-secondary)]">
                Interactive page controls detected:
                <ul className="list-disc list-inside mt-1 space-y-0.5 text-[10px] text-[var(--text-muted)]">
                  {message.metadata.detectedElements.slice(0, 3).map((el: any, i: number) => (
                    <li key={i} className="truncate">{el.text} ({el.type})</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Action Toolbar footer */}
          {!isEditing && !isThinking && (
            <div className="flex items-center gap-3.5 pt-1 select-none opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-200">
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition cursor-pointer bg-transparent border-0 p-0"
                title="Copy response"
              >
                {copied ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>

              {isUser && onEditAndRetry && !isGenerating && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition cursor-pointer bg-transparent border-0 p-0"
                  title="Edit Prompt"
                >
                  <Edit2 size={11} />
                  <span>Edit</span>
                </button>
              )}

              {isAssistant && onRegenerate && !isGenerating && (
                <button
                  onClick={() => onRegenerate(message.id)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition cursor-pointer bg-transparent border-0 p-0"
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
    </div>
  );
};

export const MessageBubble = React.memo(_MessageBubble, (prevProps, nextProps) => {
  if (prevProps.message.id !== nextProps.message.id) return false;
  if (prevProps.message.content !== nextProps.message.content) return false;
  if (prevProps.isGenerating !== nextProps.isGenerating) return false;
  if (prevProps.onCopy !== nextProps.onCopy) return false;
  if (prevProps.onRegenerate !== nextProps.onRegenerate) return false;
  if (prevProps.onEditAndRetry !== nextProps.onEditAndRetry) return false;
  return true;
});
