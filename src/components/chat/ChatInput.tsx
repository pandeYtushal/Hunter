import React, { useRef, useEffect } from "react";
import { Send, Camera, Square } from "lucide-react";
import { ImageUploader } from "./ImageUploader";
import { ClipboardManager } from "../../chat/ClipboardManager";
import type { ChatAttachment } from "../../chat/ChatTypes";

interface ChatInputProps {
  value: string;
  isGenerating: boolean;
  onChange: (val: string) => void;
  onSend: () => void;
  onStop: () => void;
  onCaptureScreenshot: () => void;
  onAttachFile: (file: File) => void;
  onAttachImageObject: (att: ChatAttachment) => void;
  disabled?: boolean;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  value,
  isGenerating,
  onChange,
  onSend,
  onStop,
  onCaptureScreenshot,
  onAttachFile,
  onAttachImageObject,
  disabled
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea height
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    ta.style.height = "auto";
    const scrollHeight = ta.scrollHeight;
    ta.style.height = `${Math.min(scrollHeight, 140)}px`;
  }, [value]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    try {
      const att = await ClipboardManager.handlePaste(e);
      if (att) {
        onAttachImageObject(att);
      }
    } catch (err: any) {
      console.warn("Failed to paste image:", err);
    }
  };

  return (
    <div className="border-t border-[var(--border-color)] bg-[var(--bg-primary)] px-4 py-3 select-none">
      <div className="relative flex items-end gap-2.5 rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2 glass-input transition">
        {/* Screenshot capture action */}
        <button
          type="button"
          onClick={onCaptureScreenshot}
          disabled={isGenerating || disabled}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-secondary)] transition cursor-pointer"
          title="Capture Browser Tab Screenshot"
        >
          <Camera size={14} />
        </button>

        {/* File attachment picker */}
        <ImageUploader onUpload={onAttachFile} disabled={isGenerating || disabled} />

        {/* Message Input Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Ask Hunter or paste screenshot... (Shift+Enter for new line)"
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent py-1.5 px-1 text-xs text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)] leading-relaxed max-h-[140px] custom-scrollbar"
        />

        {/* Send / Stop Generation Buttons */}
        {isGenerating ? (
          <button
            type="button"
            onClick={onStop}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-rose-600 hover:bg-rose-500 text-white transition cursor-pointer shadow"
            title="Stop generation"
          >
            <Square size={12} fill="currentColor" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onSend}
            disabled={(!value.trim() && !isGenerating) || disabled}
            className="btn-send-gradient flex h-8 w-8 items-center justify-center rounded-lg text-[var(--text-secondary)] disabled:opacity-35 transition cursor-pointer"
            title="Send query"
          >
            <Send size={12} />
          </button>
        )}
      </div>
    </div>
  );
};
