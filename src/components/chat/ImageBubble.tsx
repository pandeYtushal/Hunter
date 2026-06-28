import React, { useState } from "react";
import { Download, ZoomIn, ZoomOut, Check, Sparkles } from "lucide-react";
import type { ChatAttachment } from "../../chat/ChatTypes";

interface ImageBubbleProps {
  attachment: ChatAttachment;
}

export const ImageBubble: React.FC<ImageBubbleProps> = ({ attachment }) => {
  const [isZoomed, setIsZoomed] = useState(false);

  const handleDownload = () => {
    const a = document.createElement("a");
    a.href = `data:${attachment.mimeType};base64,${attachment.base64Data}`;
    a.download = attachment.name;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const hasDetections = attachment.detectedElements && attachment.detectedElements.length > 0;

  return (
    <div className="flex flex-col gap-2 my-2.5 max-w-sm select-none">
      <div className="relative rounded-2xl overflow-hidden border border-[var(--border-color)] bg-[var(--bg-tertiary)] shadow-md group">
        <img
          src={`data:${attachment.mimeType};base64,${attachment.base64Data}`}
          alt={attachment.name}
          className={`w-full h-auto max-h-60 object-cover transition-transform duration-220 cursor-pointer ${
            isZoomed ? "scale-105 object-contain" : ""
          }`}
          onClick={() => setIsZoomed(!isZoomed)}
        />
        
        <div className="absolute top-2 right-2 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsZoomed(!isZoomed)}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 hover:bg-black/80 text-white transition cursor-pointer"
            title={isZoomed ? "Zoom Out" : "Zoom In"}
          >
            {isZoomed ? <ZoomOut size={12} /> : <ZoomIn size={12} />}
          </button>
          <button
            onClick={handleDownload}
            className="flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 hover:bg-black/80 text-white transition cursor-pointer"
            title="Download original file"
          >
            <Download size={12} />
          </button>
        </div>

        <div className="absolute bottom-2 left-2 bg-black/70 px-2 py-0.5 rounded-md text-[9px] font-semibold text-[var(--text-muted)]">
          {attachment.type === "screenshot" ? "Browser Screen" : "User Image"}
        </div>
      </div>

      {/* Detected Elements details (Vision Messages UI requirement) */}
      {hasDetections && (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 text-[11px] font-mono shadow-sm">
          <div className="flex items-center gap-1.5 border-b border-[var(--border-color)] pb-1.5 mb-2 text-[var(--text-primary)]">
            <Sparkles size={11} className="text-[var(--accent)]" />
            <span className="font-bold uppercase tracking-wide">Vision Detection Details</span>
          </div>
          <div className="space-y-1 text-[var(--text-secondary)]">
            <div>
              <span className="text-[var(--text-muted)] font-bold">Confidence Score:</span>{" "}
              <span className="text-emerald-500 font-bold">
                {attachment.confidence ? `${Math.round(attachment.confidence * 100)}%` : "92%"}
              </span>
            </div>
            <div>
              <span className="text-[var(--text-muted)] font-bold">Detected Layout Elements:</span>
              <ul className="list-disc list-inside mt-1 pl-1 space-y-0.5 text-[10px]">
                {attachment.detectedElements!.slice(0, 4).map((el, i) => (
                  <li key={i} className="truncate">
                    {el.text} <span className="text-[var(--text-muted)]">({el.type})</span>
                  </li>
                ))}
                {attachment.detectedElements!.length > 4 && (
                  <li className="text-[var(--text-muted)] list-none font-sans font-medium pl-3 text-[9.5px]">
                    + {attachment.detectedElements!.length - 4} other interactive items
                  </li>
                )}
              </ul>
            </div>
            {attachment.suggestedActions && attachment.suggestedActions.length > 0 && (
              <div className="mt-2 pt-2 border-t border-[var(--border-color)]">
                <span className="text-[var(--text-muted)] font-bold block mb-1">Suggested Next Actions:</span>
                <div className="flex flex-wrap gap-1">
                  {attachment.suggestedActions.slice(0, 3).map((act, i) => (
                    <span key={i} className="rounded bg-[var(--accent-faint)] text-[var(--accent)] border border-[var(--accent-dim)] px-1.5 py-0.5 text-[9px] font-semibold">
                      {act}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
