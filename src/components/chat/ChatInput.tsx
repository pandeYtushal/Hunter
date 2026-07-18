import React, { useRef, useEffect } from "react";
import { Camera, Square, ArrowUp } from "lucide-react";
import { ImageUploader } from "./ImageUploader";
import { VoiceInput } from "../../sidebar/VoiceInput";
import { ClipboardManager } from "../../chat/ClipboardManager";
import type { ChatAttachment } from "../../chat/ChatTypes";

interface ChatInputProps {
  value: string;
  isGenerating: boolean;
  onChange: (val: string) => void;
  onSend: (val?: string) => void;
  onStop: () => void;
  onCaptureScreenshot: () => void;
  onAttachFile: (file: File) => void;
  onAttachImageObject: (att: ChatAttachment) => void;
  disabled?: boolean;
  liveAgentActive: boolean;
  onToggleLiveAgent: () => void;
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
  disabled,
  liveAgentActive,
  onToggleLiveAgent
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;

    ta.style.height = "auto";
    const maxHeight = Math.min(180, Math.max(112, window.innerHeight * 0.28));
    const scrollHeight = ta.scrollHeight;
    ta.style.height = `${Math.min(scrollHeight, maxHeight)}px`;
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
    <div className="bg-transparent px-4 pb-4 select-none shrink-0 max-w-2xl mx-auto w-full">
      <div className="chat-composer relative flex items-center gap-2.5 rounded-2xl p-2.5 transition duration-200 border border-[var(--border-color)] bg-[var(--bg-secondary)] focus-within:border-[var(--accent)] focus-within:ring-2 focus-within:ring-[var(--accent-dim)] focus-within:shadow-[0_0_20px_rgba(var(--accent-rgb),0.12)] min-h-[58px] shadow-md hover:border-[var(--border-hover)]">
        
        {/* Attachment & Screenshot Controls */}
        <div className="flex items-center gap-1.5 shrink-0 self-end mb-0.5">
          {/* File attachment picker */}
          <ImageUploader onUpload={onAttachFile} disabled={isGenerating || disabled} />

          {/* Screenshot capture action */}
          <button
            type="button"
            onClick={() => onCaptureScreenshot()}
            disabled={isGenerating || disabled}
            className="flex h-8 w-8 items-center justify-center rounded-xl text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] border border-transparent hover:border-[var(--border-color)] transition duration-150 cursor-pointer bg-transparent"
            title="Capture Browser Tab Screenshot"
          >
            <Camera size={14} />
          </button>

          {/* Voice Speech-to-Text Input Button */}
          <VoiceInput
            active={liveAgentActive}
            onToggle={onToggleLiveAgent}
            disabled={disabled}
            onError={(msg) => console.warn(msg)}
            onTranscriptChange={(text) => {
              if (isGenerating) return;
              onChange(text);
            }}
            onTranscriptSubmit={(text) => {
              if (isGenerating) {
                console.log("Ignoring transcript during active execution:", text);
                return;
              }
              onChange(text);
              onSend(text); // Trigger immediate submission when a spoken sentence is finished
            }}
          />
        </div>

        {/* Message Input Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          placeholder="Ask Hunter anything..."
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none bg-transparent py-2 px-1 text-[13.5px] font-normal text-[var(--text-primary)] focus:outline-none placeholder:text-[var(--text-muted)] leading-relaxed max-h-[25vh] min-h-8 custom-scrollbar font-sans border-0"
        />

        {/* Send / Stop Action Trigger */}
        <div className="shrink-0 self-end mb-0.5">
          {isGenerating ? (
            <button
              type="button"
              onClick={() => onStop()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--danger)] hover:opacity-90 text-white transition cursor-pointer border-0 shadow-sm"
              title="Stop generation"
            >
              <Square size={10} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onSend()}
              disabled={(!value.trim() && !isGenerating) || disabled}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--accent)] text-white hover:opacity-90 disabled:opacity-20 disabled:bg-[var(--bg-tertiary)] disabled:text-[var(--text-muted)] transition cursor-pointer border-0 shadow-sm"
              title="Send query"
            >
              <ArrowUp size={13} strokeWidth={2.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
