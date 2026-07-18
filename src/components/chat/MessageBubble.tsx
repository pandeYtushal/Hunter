import React, { useState, useRef, useEffect } from "react";
import { Copy, Check, RotateCw, Edit2, User, Bot, AlertCircle, Cpu } from "lucide-react";
import { Markdown } from "../../shared/components/Markdown";
import { ImageBubble } from "./ImageBubble";
import { TypingIndicator } from "./TypingIndicator";
import type { ChatMessage } from "../../chat/ChatTypes";

interface MessageBubbleProps {
  message: ChatMessage;
  onCopy: (text: string) => void;
  onRegenerate?: (id: string) => void;
  onEditAndRetry?: (id: string, newText: string) => void;
  isGenerating?: boolean;
  devModeOpen?: boolean;
  /** When true, action toolbar stays visible (last message in thread). */
  forceShowActions?: boolean;
}

const _MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onCopy,
  onRegenerate,
  onEditAndRetry,
  isGenerating,
  devModeOpen = false,
  forceShowActions = false
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

  const formatTime = (dateStr?: string) => {
    if (!dateStr) return "";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return "";
      return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  };
  const timeStr = formatTime(message.createdAt);

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

  if (isUser) {
    return (
      <div
        ref={bubbleRef}
        className="w-full py-2.5 transition-all duration-200 animate-fade-in group user-row"
      >
        <div className="max-w-full w-full mx-auto px-1 flex gap-3.5 flex-row-reverse">
          {/* Icon Avatar */}
          <div className="shrink-0 select-none">
            <div className="user-avatar flex h-8 w-8 items-center justify-center rounded-full bg-[var(--text-primary)] text-[var(--bg-primary)] font-semibold text-xs shadow-sm">
              <User size={14} />
            </div>
          </div>

          {/* Content Wrapper */}
          <div className="flex-1 min-w-0 flex flex-col items-end space-y-1.5">
            {/* Header Details */}
            <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted)] tracking-normal font-sans select-none">
              <span>You</span>
              {timeStr && (
                <>
                  <span className="text-[10px] opacity-60">•</span>
                  <span className="text-[11px] font-medium text-[var(--text-muted)]">
                    {timeStr}
                  </span>
                </>
              )}
            </div>

            {/* Speech Bubble */}
            <div className="user-message-bubble max-w-[90%] rounded-2xl rounded-tr-sm bg-[var(--bg-tertiary)] text-[var(--text-primary)] border border-[var(--border-color)] px-4 py-2.5 shadow-md text-[13.5px] leading-relaxed text-left whitespace-pre-wrap select-text">
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

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-1.5">
                {message.attachments.map((att) => (
                  <ImageBubble key={att.id} attachment={att} />
                ))}
              </div>
            )}

            {/* Toolbar — always visible on last message */}
            {!isEditing && onEditAndRetry && !isGenerating && (
              <div
                className={`flex items-center gap-3.5 pt-1 select-none transition-opacity duration-200 ${
                  forceShowActions
                    ? "opacity-100"
                    : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                }`}
              >
                <button
                  onClick={() => setIsEditing(true)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition cursor-pointer bg-transparent border-0 p-0"
                  title="Edit Prompt"
                >
                  <Edit2 size={14} />
                  <span>Edit</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isLiveStreaming = isLastAssistant && Boolean(isGenerating) && !isThinking && !isError;
  const isAvatarLive = (isThinking || isLiveStreaming) && !isError;

  // Thinking with no real content: Claude/GPT style — no bordered bubble
  if (isThinking && !message.content?.trim()) {
    return (
      <div ref={bubbleRef} className="w-full assistant-row">
        <TypingIndicator />
      </div>
    );
  }

  return (
    <div
      ref={bubbleRef}
      className="w-full py-2.5 transition-all duration-200 animate-fade-in group assistant-row"
    >
      <div className="max-w-full w-full mx-auto px-1 flex gap-3.5 flex-row">
        {/* Icon Avatar — pulse rings while thinking / streaming */}
        <div className="shrink-0 select-none">
          <div className={`flex h-8 w-8 items-center justify-center rounded-lg border shadow-sm bg-[var(--bg-secondary)] ${
            isError 
              ? "bg-rose-50 border-rose-200 text-rose-600 dark:bg-rose-950/30 dark:border-rose-500/30 dark:text-rose-400" 
              : isAvatarLive
                ? "hunter-avatar-live"
                : "assistant-avatar"
          }`}>
            {isError ? <AlertCircle size={14} /> : <Bot size={14} />}
          </div>
        </div>

        {/* Content Wrapper */}
        <div className="flex-grow min-w-0 flex flex-col items-start space-y-1.5">
          {/* Header Details */}
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-[var(--text-muted)] tracking-normal font-sans select-none">
            <span>{isError ? "System Error" : "Hunter"}</span>
            {isThinking && (
              <>
                <span className="text-[10px] opacity-60">•</span>
                <span className="text-[10px] font-medium opacity-80 font-normal animate-shimmer-soft">
                  thinking
                </span>
              </>
            )}
            {isLiveStreaming && (
              <>
                <span className="text-[10px] opacity-60">•</span>
                <span className="text-[10px] font-medium opacity-80 font-normal">
                  writing
                </span>
              </>
            )}
            {timeStr && !isThinking && !isLiveStreaming && (
              <>
                <span className="text-[10px] opacity-60">•</span>
                <span className="text-[11px] font-medium text-[var(--text-muted)]">
                  {timeStr}
                </span>
              </>
            )}
            {devModeOpen && message.metadata?.model && (
              <>
                <span className="text-[10px] opacity-60">•</span>
                <span className="flex items-center gap-1 text-[9px] text-[var(--text-secondary)] bg-[var(--bg-tertiary)] border border-[var(--border-color)] px-1.5 py-0.5 rounded font-mono lowercase">
                  <Cpu size={8.5} className="text-[var(--text-secondary)]" />
                  {message.metadata.provider}: {message.metadata.model.replace("models/", "")}
                </span>
              </>
            )}
          </div>

          {/* Thinking with status text (e.g. vision) — no heavy border box */}
          {isThinking ? (
            <div className="max-w-[92%] text-left select-none">
              <TypingIndicator compact label={message.content} />
            </div>
          ) : isError ? (
            <div className="assistant-message-bubble w-fit max-w-[92%] rounded-2xl rounded-tl-sm border border-rose-500/25 bg-rose-500/5 px-4 py-3 shadow-md text-left select-text">
              <div className="p-1 text-red-600 dark:text-red-400 font-mono text-[11.5px] leading-relaxed max-w-xl">
                {message.content}
              </div>
            </div>
          ) : (
            <div className="assistant-message-bubble w-fit max-w-[92%] rounded-2xl rounded-tl-sm border border-[var(--border-color)] bg-[var(--bg-secondary)] px-4 py-3 shadow-md text-[13.5px] leading-relaxed text-left select-text relative">
              <div className="markdown-container">
                <Markdown
                  content={String(message.content ?? "")}
                  isStreaming={isLiveStreaming}
                />
              </div>

              {/* Vision Detection Element card */}
              {message.metadata?.detectedElements && message.metadata.detectedElements.length > 0 && !message.attachments && (
                <div className="mt-3 rounded-xl border border-[var(--border-color)] bg-[var(--bg-tertiary)] p-3 text-[11px] font-mono max-w-md w-full">
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
            </div>
          )}

          {/* Action Toolbar — always visible on last message */}
          {!isThinking && (
            <div
              className={`flex items-center gap-3.5 pt-1 select-none transition-opacity duration-200 ${
                forceShowActions
                  ? "opacity-100"
                  : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
              }`}
            >
              <button
                onClick={handleCopy}
                className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition cursor-pointer bg-transparent border-0 p-0"
                title="Copy response"
              >
                {copied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                <span>{copied ? "Copied" : "Copy"}</span>
              </button>

              {isAssistant && onRegenerate && !isGenerating && (
                <button
                  onClick={() => onRegenerate(message.id)}
                  className="flex items-center gap-1 text-[11px] font-semibold text-[var(--text-muted)] hover:text-[var(--text-secondary)] transition cursor-pointer bg-transparent border-0 p-0"
                  title="Regenerate this response"
                >
                  <RotateCw size={14} />
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
  if (prevProps.devModeOpen !== nextProps.devModeOpen) return false;
  if (prevProps.forceShowActions !== nextProps.forceShowActions) return false;
  if (prevProps.onCopy !== nextProps.onCopy) return false;
  if (prevProps.onRegenerate !== nextProps.onRegenerate) return false;
  if (prevProps.onEditAndRetry !== nextProps.onEditAndRetry) return false;
  return true;
});

