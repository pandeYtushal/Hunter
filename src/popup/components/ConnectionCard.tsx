import React from "react";
import type { PageSnapshot } from "../../shared/types/messages";

interface ConnectionCardProps {
  isConnected: boolean;
  snapshot: PageSnapshot;
  error: string;
  hasApiKey: boolean;
}

export const ConnectionCard: React.FC<ConnectionCardProps> = ({
  isConnected,
  snapshot,
  error,
  hasApiKey
}) => {
  return (
    <div className="flex flex-col gap-2.5">
      {isConnected ? (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)] p-3 flex flex-col gap-1 shadow-sm transition hover:border-[var(--accent)]/20">
          <div className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            <p className="font-mono text-[8px] uppercase tracking-wider text-[var(--text-muted)] font-bold">
              Connected Active Tab
            </p>
          </div>
          <h2 className="text-[11px] font-bold text-[var(--text-primary)] truncate" title={snapshot.title}>
            {snapshot.title}
          </h2>
          <p className="font-mono text-[8.5px] text-[var(--text-muted)] truncate mt-0.5">{snapshot.url}</p>
        </div>
      ) : (
        <div className="rounded-xl border border-[var(--border-color)] bg-[var(--bg-secondary)]/40 p-3.5 text-center transition hover:border-zinc-400 dark:hover:border-zinc-800">
          <p className="font-mono text-[8px] uppercase tracking-widest text-[var(--text-muted)] mb-1 font-bold">
            Connection Standby
          </p>
          <p className="text-[10px] leading-relaxed text-[var(--text-secondary)]">
            Open Hunter on any webpage to activate the browser AI copilot.
          </p>
        </div>
      )}

      {!hasApiKey && (
        <p className="font-mono text-[8.5px] text-[var(--accent)] leading-normal bg-[var(--accent)]/5 py-1.5 px-2 rounded border border-[var(--accent)]/10 flex items-center gap-1.5 animate-pulse-glow">
          Configure your API credentials to enable autonomous AI goals.
        </p>
      )}

      {error && !isConnected && (
        <p className="font-mono text-[8.5px] text-[var(--text-secondary)] leading-normal bg-[var(--bg-tertiary)]/40 py-1.5 px-2 rounded border border-[var(--border-color)]">
          {error}
        </p>
      )}
    </div>
  );
};
