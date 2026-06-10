import { Activity, AlertTriangle, CheckCircle2, RefreshCw, Target, Shield, TrendingUp } from "lucide-react";
import type { AgentState } from "../shared/types/agent";
import type { AgentMetricRecord } from "../debug/AgentMetrics";
import type { ExecutionLogEntry } from "../debug/ExecutionLogger";
import type { HealthCheckResult } from "../ai/healthCheck";
import type { LongTermMemory } from "../types/Memory";

interface DeveloperPanelProps {
  agentState: AgentState | null;
  logs: ExecutionLogEntry[];
  metrics: AgentMetricRecord[];
  memory: LongTermMemory | null;
  healthChecks: HealthCheckResult[];
}

export const DeveloperPanel = ({ agentState, logs, metrics, memory, healthChecks }: DeveloperPanelProps) => (
  <section className="border-b border-[var(--border-color)] bg-[var(--bg-primary)] p-3.5 text-[10px] text-[var(--text-secondary)] space-y-3 font-mono">
    <div className="flex items-center gap-1.5 font-bold uppercase tracking-wider text-[var(--text-muted)] font-mono">
      <Activity size={12} className="text-[#ff6b35]" />
      Developer Operations Console
    </div>

    <div className="grid grid-cols-1 gap-2.5">
      {/* Agent status */}
      <div className="rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 font-mono">
        <div className="font-bold text-[var(--text-secondary)] uppercase text-[9px] tracking-wide border-b border-[var(--border-color)] pb-1 mb-1.5 flex justify-between items-center">
          <span>Agent Diagnostics</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 gap-1 text-[10px] text-[var(--text-secondary)]">
          <span>Agent: <strong className="text-[var(--text-primary)]">{agentState?.currentAgent ?? "Unknown"}</strong></span>
          <span>State: <strong className="text-[var(--text-primary)]">{agentState?.machineState ?? "IDLE"}</strong></span>
          <span>Plan steps: <strong className="text-[var(--text-primary)]">{agentState?.steps.length ?? 0}</strong></span>
          <span>Errors: <strong className="text-rose-500">{agentState?.errors.length ?? 0}</strong></span>
        </div>
      </div>

      {/* Cognitive Reasoning */}
      <div className="rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 font-mono">
        <div className="font-bold text-[#ff6b35] uppercase text-[9px] tracking-wide border-b border-[var(--border-color)] pb-1 mb-1.5">
          Cognitive Reasoning Output
        </div>
        <div className="text-[10px] text-[var(--text-secondary)] space-y-1.5">
          <div className="leading-relaxed"><b>Reasoning:</b> {agentState?.reasoning || "—"}</div>
          <div className="flex items-center justify-between text-[9px] border-t border-[var(--border-color)] pt-1.5 mt-1.5">
            <span>Tool: <code className="bg-[var(--bg-primary)] px-1 py-0.5 rounded text-[8px] border border-[var(--border-color)] text-[var(--text-primary)] font-mono">{agentState?.selectedTool || "—"}</code></span>
            <span>Confidence: <strong className="text-[#ff6b35]">{agentState?.confidence !== undefined ? (agentState.confidence <= 1 ? `${Math.round(agentState.confidence * 100)}%` : `${Math.round(agentState.confidence)}%`) : "—"}</strong></span>
          </div>
        </div>
      </div>

      {/* Decision Log History */}
      <div className="rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 font-mono">
        <div className="font-bold text-[var(--text-secondary)] uppercase text-[9px] tracking-wide border-b border-[var(--border-color)] pb-1 mb-1.5">
          Decision History Log
        </div>
        <div className="max-h-24 overflow-y-auto space-y-1.5 text-[9px] text-[var(--text-secondary)] pr-1 custom-scrollbar">
          {agentState?.decisionHistory?.map((entry, idx) => (
            <div key={idx} className="border-b border-[var(--border-color)]/60 pb-1.5 mb-1.5 last:border-0 last:mb-0">
              <div className="flex justify-between font-bold text-[var(--text-secondary)]">
                <span className="text-[var(--text-primary)]">{entry.action}</span>
                <span className="text-[#ff6b35]">{entry.confidence <= 1 ? `${Math.round(entry.confidence * 100)}%` : `${Math.round(entry.confidence)}%`}</span>
              </div>
              <p className="italic text-[var(--text-muted)] mt-0.5 leading-snug">{entry.reasoning}</p>
              <div className="text-[8px] text-[var(--text-muted)] mt-0.5 truncate">Result: {entry.observation}</div>
            </div>
          ))}
          {(!agentState?.decisionHistory || agentState.decisionHistory.length === 0) && (
            <span className="text-[var(--text-muted)] italic">No decisions logged yet.</span>
          )}
        </div>
      </div>

      {/* Reflection & Replanning Dashboard */}
      <div className="rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 font-mono">
        <div className="flex items-center gap-1 font-bold text-[var(--text-secondary)] uppercase text-[9px] tracking-wide border-b border-[var(--border-color)] pb-1 mb-1.5">
          <TrendingUp size={10} className="text-[#ff6b35]" />
          Reflection & Replanning
        </div>
        <div className="grid grid-cols-2 gap-1 text-[10px] text-[var(--text-secondary)]">
          <span className="truncate">Goal: <span className="font-semibold text-[var(--text-primary)]">{agentState?.goalProgress?.goal ?? agentState?.goal ?? "—"}</span></span>
          <span>Progress: <span className="font-bold text-emerald-500">{agentState?.goalProgress?.completionPercentage ?? 0}%</span></span>
          <span>Failures: <span className="font-medium text-rose-500">{agentState?.failureCount ?? 0}</span></span>
          <span>Replans: <span className="font-medium text-[#ff6b35]">{agentState?.replanCount ?? 0}</span></span>
          <span>Recoveries: <span className="font-medium text-blue-500">{agentState?.recoveryCount ?? 0}</span></span>
          <span>Blocked: <span className={`font-medium ${agentState?.goalProgress?.isBlocked ? "text-rose-500" : "text-emerald-500"}`}>{agentState?.goalProgress?.isBlocked ? "Yes" : "No"}</span></span>
        </div>

        {/* Subgoal list */}
        {agentState?.goalProgress?.subGoals && agentState.goalProgress.subGoals.length > 0 && (
          <div className="mt-1.5 max-h-20 overflow-y-auto space-y-0.5 border-t border-[var(--border-color)] pt-1.5">
            {agentState.goalProgress.subGoals.map((sg) => (
              <div key={sg.id} className="flex items-center gap-1.5 text-[var(--text-muted)] text-[9px]">
                {sg.status === "completed" && <CheckCircle2 size={9} className="text-emerald-500 shrink-0" />}
                {sg.status === "failed" && <AlertTriangle size={9} className="text-rose-500 shrink-0" />}
                {sg.status === "running" && <RefreshCw size={9} className="text-[#ff6b35] shrink-0 animate-spin" />}
                {sg.status === "pending" && <span className="h-1.5 w-1.5 rounded-full border border-[var(--border-color)] inline-block shrink-0" />}
                <span className="truncate">{sg.description}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Execution timeline */}
      <div className="rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 font-mono">
        <div className="font-bold text-[var(--text-secondary)] uppercase text-[9px] tracking-wide border-b border-[var(--border-color)] pb-1 mb-1.5">
          Execution Timeline Logs
        </div>
        <div className="max-h-24 overflow-y-auto space-y-1.5 text-[9px] text-[var(--text-muted)] pr-1 custom-scrollbar">
          {logs.slice(0, 8).map((log) => (
            <div key={log.id} className="flex items-start gap-1.5 leading-normal">
              {log.level === "error" ? <AlertTriangle size={10} className="text-rose-500 shrink-0 mt-0.5" /> : <CheckCircle2 size={10} className="text-emerald-500 shrink-0 mt-0.5" />}
              <span className="break-all"><strong className="text-[var(--text-primary)]">{log.action ?? "system"}</strong>: {log.message}</span>
            </div>
          ))}
          {logs.length === 0 && <span className="text-[var(--text-muted)]">No execution logs yet.</span>}
        </div>
      </div>

      {/* Metrics */}
      <div className="rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 font-mono">
        <div className="font-bold text-[var(--text-secondary)] uppercase text-[9px] tracking-wide border-b border-[var(--border-color)] pb-1 mb-1.5">
          Orchestration Metrics
        </div>
        <div className="grid grid-cols-2 gap-1 text-[10px] text-[var(--text-secondary)]">
          {metrics.slice(0, 6).map((metric) => (
            <span key={`${metric.agent}:${metric.action}`} className="truncate" title={metric.action}>
              {metric.action}: <strong className="text-[var(--text-primary)]">{metric.runs - metric.failures}/{metric.runs}</strong>
            </span>
          ))}
          {metrics.length === 0 && <span className="text-[var(--text-muted)]">No metrics yet.</span>}
        </div>
      </div>

      {/* Memory snapshot */}
      <div className="rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 font-mono">
        <div className="font-bold text-[var(--text-secondary)] uppercase text-[9px] tracking-wide border-b border-[var(--border-color)] pb-1 mb-1.5">
          Memory State Snapshot
        </div>
        <div className="grid grid-cols-2 gap-1 text-[10px] text-[var(--text-muted)]">
          <span>Saved Jobs: <strong className="text-[var(--text-primary)]">{memory?.savedJobs.length ?? 0}</strong></span>
          <span>Letters: <strong className="text-[var(--text-primary)]">{memory?.generatedCoverLetters.length ?? 0}</strong></span>
          <span>Companies: <strong className="text-[var(--text-primary)]">{memory?.favoriteCompanies.length ?? 0}</strong></span>
          <span>Successful: <strong className="text-[var(--text-primary)]">{memory?.successfulApplications.length ?? 0}</strong></span>
        </div>
      </div>

      {/* Health */}
      <div className="rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 font-mono">
        <div className="font-bold text-[var(--text-secondary)] uppercase text-[9px] tracking-wide border-b border-[var(--border-color)] pb-1 mb-1.5">
          System Core Diagnostics
        </div>
        <div className="space-y-1.5 text-[9px] text-[var(--text-muted)]">
          {healthChecks.map((check) => (
            <div key={check.name} className="flex items-center gap-1.5">
              {check.ok ? <CheckCircle2 size={10} className="text-emerald-500" /> : <AlertTriangle size={10} className="text-amber-500" />}
              <span className="truncate">{check.name}: <strong className="text-[var(--text-secondary)]">{check.message}</strong></span>
            </div>
          ))}
          {healthChecks.length === 0 && <span className="text-[var(--text-muted)]">Diagnostics have not run yet.</span>}
        </div>
      </div>
    </div>
  </section>
);
