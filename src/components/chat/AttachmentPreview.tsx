import React from "react";
import { X, Image as ImageIcon } from "lucide-react";
import type { ChatAttachment } from "../../chat/ChatTypes";

interface AttachmentPreviewProps {
  attachments: ChatAttachment[];
  onRemove: (id: string) => void;
}

export const AttachmentPreview: React.FC<AttachmentPreviewProps> = ({ attachments, onRemove }) => {
  if (attachments.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 px-4 py-2 border-t border-[var(--border-color)] bg-[var(--bg-primary)]">
      {attachments.map((att) => (
        <div
          key={att.id}
          className="relative flex h-14 w-14 items-center justify-center rounded-lg border border-[var(--border-color)] bg-[var(--bg-tertiary)] overflow-hidden group shadow-sm select-none"
        >
          {att.type === "image" || att.type === "screenshot" ? (
            <img
              src={`data:${att.mimeType};base64,${att.base64Data}`}
              alt={att.name}
              className="h-full w-full object-cover"
            />
          ) : (
            <ImageIcon className="h-5 w-5 text-[var(--text-muted)]" />
          )}

          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              onClick={() => onRemove(att.id)}
              className="p-1 rounded-full bg-[var(--text-secondary)] text-[var(--bg-primary)] hover:bg-rose-600 transition cursor-pointer"
              title="Remove Attachment"
            >
              <X size={10} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
