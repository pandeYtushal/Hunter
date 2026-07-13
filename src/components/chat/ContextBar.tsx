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
  const activeChips = [];

  if (currentUrl) {
    activeChips.push({
      icon: Globe2,
      label: shortHost(currentUrl),
      title: "Current website context",
      className: "border-[rgba(255,107,53,0.18)] bg-[rgba(255,107,53,0.06)] text-[var(--accent)]"
    });
  }

  if (browserControlEnabled) {
    activeChips.push({
      icon: MousePointer2,
      label: "Browser control",
      title: "Automation mode enabled",
      className: "border-[rgba(255,107,53,0.18)] bg-[rgba(255,107,53,0.06)] text-[var(--accent)]"
    });
  }

  if (hasMemory) {
    activeChips.push({
      icon: Brain,
      label: "Memory active",
      title: "Long-term memory context enabled",
      className: "border-emerald-500/20 bg-emerald-500/5 text-emerald-500"
    });
  }

  if (activeGoal) {
    activeChips.push({
      icon: ShieldCheck,
      label: `Goal: ${activeGoal}`,
      title: "Active safety / automation goal running",
      className: "border-indigo-500/20 bg-indigo-500/5 text-indigo-400"
    });
  }

  if (activeChips.length === 0) return null;

  return (
    <div className="px-4 pb-2.5 pt-1 bg-transparent select-none shrink-0">
      <div className="flex flex-wrap gap-1.5 overflow-x-auto hide-scrollbar animate-fade-in" aria-label="Hunter context">
        {activeChips.map(({ icon: Icon, label, title, className }) => (
          <span
            key={label}
            title={title}
            className={`inline-flex h-6.5 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[10.5px] font-semibold transition-all duration-200 shadow-sm ${className}`}
          >
            <Icon size={11} className="shrink-0" />
            <span className="max-w-[160px] truncate">{label}</span>
          </span>
        ))}
      </div>
    </div>
  );
};
