import React from "react";
import { Brain, FileText, Globe2, Image, MousePointer2, ShieldCheck } from "lucide-react";

interface ContextBarProps {
  currentUrl?: string;
  hasAttachments: boolean;
  hasMemory: boolean;
  browserControlEnabled: boolean;
  activeGoal?: string;
}

const shortHost = (url?: string) => {
  if (!url) return "No page";
  try {
    return new URL(url).host.replace(/^www\./, "");
  } catch {
    return url.replace(/https?:\/\/(www\.)?/, "").split("/")[0];
  }
};

export const ContextBar: React.FC<ContextBarProps> = ({
  currentUrl,
  hasAttachments,
  hasMemory,
  browserControlEnabled,
  activeGoal
}) => {
  const chips = [
    { icon: Globe2, label: shortHost(currentUrl), active: Boolean(currentUrl), title: "Current website" },
    { icon: Image, label: hasAttachments ? "Screenshot attached" : "No image", active: hasAttachments, title: "Visual context" },
    { icon: FileText, label: "Resume", active: hasMemory, title: "Profile and resume context" },
    { icon: Brain, label: hasMemory ? "Memory on" : "Memory ready", active: hasMemory, title: "Long term memory" },
    { icon: MousePointer2, label: browserControlEnabled ? "Browser control" : "Chat only", active: browserControlEnabled, title: "Automation mode" },
    { icon: ShieldCheck, label: activeGoal ? "Goal active" : "Safe actions", active: Boolean(activeGoal), title: "Permission guard" }
  ];

  return (
    <div className="px-3 pb-2 pt-1.5 bg-[var(--bg-primary)]">
      <div className="flex gap-1.5 overflow-x-auto hide-scrollbar" aria-label="Hunter context">
        {chips.map(({ icon: Icon, label, active, title }) => (
          <span
            key={`${title}-${label}`}
            title={title}
            className={`inline-flex h-7 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[11px] font-medium transition-colors ${
              active
                ? "border-[rgba(255,107,53,0.28)] bg-[rgba(255,107,53,0.1)] text-[var(--text-primary)]"
                : "border-[var(--border-color)] bg-[var(--bg-secondary)] text-[var(--text-muted)]"
            }`}
          >
            <Icon size={12} className={active ? "text-[var(--primary)]" : "text-[var(--text-muted)]"} />
            <span className="max-w-[140px] truncate">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
