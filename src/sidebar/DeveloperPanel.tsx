import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
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
  <section className="border-b border-zinc-200 bg-zinc-50/80 p-3 text-[10px] dark:border-zinc-800 dark:bg-black/40">
    <div className="mb-2 flex items-center gap-1.5 font-bold uppercase tracking-wider text-zinc-500">
      <Activity size={12} />
      Developer Panel
    </div>

    <div className="grid gap-2">
      <div className="rounded border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="font-semibold text-zinc-700 dark:text-zinc-300">Agent</div>
        <div className="mt-1 grid grid-cols-2 gap-1 text-zinc-500">
          <span>Current: {agentState?.currentAgent ?? "Unknown"}</span>
          <span>State: {agentState?.machineState ?? "IDLE"}</span>
          <span>Plan steps: {agentState?.steps.length ?? 0}</span>
          <span>Errors: {agentState?.errors.length ?? 0}</span>
        </div>
      </div>

      <div className="rounded border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="font-semibold text-zinc-700 dark:text-zinc-300">Execution Timeline</div>
        <div className="mt-1 max-h-24 overflow-y-auto space-y-1">
          {logs.slice(0, 8).map((log) => (
            <div key={log.id} className="flex items-center gap-1 text-zinc-500">
              {log.level === "error" ? <AlertTriangle size={10} className="text-rose-500" /> : <CheckCircle2 size={10} className="text-emerald-500" />}
              <span className="truncate">{log.action ?? "system"}: {log.message}</span>
            </div>
          ))}
          {logs.length === 0 && <span className="text-zinc-400">No execution logs yet.</span>}
        </div>
      </div>

      <div className="rounded border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="font-semibold text-zinc-700 dark:text-zinc-300">Metrics</div>
        <div className="mt-1 grid grid-cols-2 gap-1 text-zinc-500">
          {metrics.slice(0, 6).map((metric) => (
            <span key={`${metric.agent}:${metric.action}`} className="truncate">
              {metric.action}: {metric.runs - metric.failures}/{metric.runs}
            </span>
          ))}
          {metrics.length === 0 && <span className="text-zinc-400">No metrics yet.</span>}
        </div>
      </div>

      <div className="rounded border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="font-semibold text-zinc-700 dark:text-zinc-300">Memory Snapshot</div>
        <div className="mt-1 grid grid-cols-2 gap-1 text-zinc-500">
          <span>Saved jobs: {memory?.savedJobs.length ?? 0}</span>
          <span>Letters: {memory?.generatedCoverLetters.length ?? 0}</span>
          <span>Companies: {memory?.favoriteCompanies.length ?? 0}</span>
          <span>Successful: {memory?.successfulApplications.length ?? 0}</span>
        </div>
      </div>

      <div className="rounded border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="font-semibold text-zinc-700 dark:text-zinc-300">Health</div>
        <div className="mt-1 space-y-1 text-zinc-500">
          {healthChecks.map((check) => (
            <div key={check.name} className="flex items-center gap-1">
              {check.ok ? <CheckCircle2 size={10} className="text-emerald-500" /> : <AlertTriangle size={10} className="text-amber-500" />}
              <span className="truncate">{check.name}: {check.message}</span>
            </div>
          ))}
          {healthChecks.length === 0 && <span className="text-zinc-400">Diagnostics have not run yet.</span>}
        </div>
      </div>
    </div>
  </section>
);
