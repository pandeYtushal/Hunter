import React, { useState } from "react";
import { Brain, ChevronDown, ChevronUp, Globe2, MousePointer2, ShieldCheck } from "lucide-react";

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
  hasMemory,
  browserControlEnabled,
  activeGoal
}) => {
  const [expanded, setExpanded] = useState(false);

  const chips: Array<{
    icon: typeof Globe2;
    label: string;
    title: string;
    className: string;
  }> = [];

  if (currentUrl) {
    chips.push({
      icon: Globe2,
      label: shortHost(currentUrl),
      title: "Current website context",
      className: "border-[rgba(255,107,53,0.18)] bg-[rgba(255,107,53,0.06)] text-[var(--accent)]"
    });
  }

  if (browserControlEnabled) {
    chips.push({
      icon: MousePointer2,
      label: "Browser control",
      title: "Automation mode enabled",
      className: "border-[rgba(255,107,53,0.18)] bg-[rgba(255,107,53,0.06)] text-[var(--accent)]"
    });
  }

  if (hasMemory) {
    chips.push({
      icon: Brain,
      label: "Memory",
      title: "Conversation memory active",
      className: "border-emerald-500/20 bg-emerald-500/5 text-emerald-500"
    });
  }

  if (activeGoal) {
    chips.push({
      icon: ShieldCheck,
      label: `Goal: ${activeGoal}`,
      title: "Active automation goal",
      className: "border-indigo-500/20 bg-indigo-500/5 text-indigo-400"
    });
  }

  if (chips.length === 0) return null;

  const primary = chips[0];
  const extraCount = chips.length - 1;
  const PrimaryIcon = primary.icon;

  return (
    <div className="px-4 pb-1.5 pt-0.5 bg-transparent select-none shrink-0">
      {!expanded ? (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-[var(--border-color)] bg-[var(--bg-secondary)] px-2.5 py-1 text-[10.5px] font-semibold text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)] transition cursor-pointer shadow-sm"
          title="Show context details"
          aria-expanded={false}
        >
          <PrimaryIcon size={11} className="shrink-0 text-[var(--accent)]" />
          <span className="truncate max-w-[160px]">{primary.label}</span>
          {extraCount > 0 && (
            <span className="rounded-full bg-[var(--bg-tertiary)] px-1.5 py-0.5 text-[9px] font-mono text-[var(--text-muted)] border border-[var(--border-color)]">
              +{extraCount}
            </span>
          )}
          <ChevronDown size={11} className="shrink-0 text-[var(--text-muted)]" />
        </button>
      ) : (
        <div className="space-y-1.5 animate-fade-in">
          <div className="flex flex-wrap gap-1.5 items-center" aria-label="Hunter context">
            {chips.map(({ icon: Icon, label, title, className }) => (
              <span
                key={label}
                title={title}
                className={`inline-flex h-6 shrink-0 items-center gap-1.5 rounded-full border px-2.5 text-[10.5px] font-semibold shadow-sm ${className}`}
              >
                <Icon size={11} className="shrink-0" />
                <span className="max-w-[140px] truncate">{label}</span>
              </span>
            ))}
            <button
              type="button"
              onClick={() => setExpanded(false)}
              className="inline-flex h-6 items-center gap-0.5 rounded-full border border-[var(--border-color)] bg-transparent px-2 text-[10px] text-[var(--text-muted)] hover:text-[var(--text-primary)] cursor-pointer"
              aria-expanded={true}
              title="Collapse context"
            >
              <ChevronUp size={11} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
