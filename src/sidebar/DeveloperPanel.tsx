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
  <section className="border-b border-zinc-200 bg-zinc-50/80 p-3 text-[10px] dark:border-zinc-800 dark:bg-black/40">
    <div className="mb-2 flex items-center gap-1.5 font-bold uppercase tracking-wider text-zinc-500">
      <Activity size={12} />
      Developer Panel
    </div>

    <div className="grid gap-2">

      {/* Agent status */}
      <div className="rounded border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="font-semibold text-zinc-700 dark:text-zinc-300">Agent</div>
        <div className="mt-1 grid grid-cols-2 gap-1 text-zinc-500">
          <span>Current: {agentState?.currentAgent ?? "Unknown"}</span>
          <span>State: {agentState?.machineState ?? "IDLE"}</span>
          <span>Plan steps: {agentState?.steps.length ?? 0}</span>
          <span>Errors: {agentState?.errors.length ?? 0}</span>
        </div>
      </div>

      {/* Reflection & Replanning Dashboard */}
      <div className="rounded border border-indigo-200 bg-indigo-50/40 p-2 dark:border-indigo-900/40 dark:bg-indigo-950/10">
        <div className="flex items-center gap-1 font-semibold text-indigo-700 dark:text-indigo-400 mb-1.5">
          <TrendingUp size={10} />
          Reflection Engine
        </div>
        <div className="grid grid-cols-2 gap-1 text-zinc-500">
          <span className="flex items-center gap-1">
            <Target size={9} className="text-indigo-400" />
            Goal: <span className="truncate font-medium text-zinc-700 dark:text-zinc-300 ml-1">{agentState?.goalProgress?.goal ?? agentState?.goal ?? "—"}</span>
          </span>
          <span className="flex items-center gap-1">
            Progress: <span className="font-bold text-emerald-600 dark:text-emerald-400 ml-1">{agentState?.goalProgress?.completionPercentage ?? 0}%</span>
          </span>
          <span className="flex items-center gap-1">
            <AlertTriangle size={9} className="text-rose-400" />
            Failures: <span className="font-medium text-rose-600 dark:text-rose-400 ml-1">{agentState?.failureCount ?? 0}</span>
          </span>
          <span className="flex items-center gap-1">
            <RefreshCw size={9} className="text-amber-400" />
            Replans: <span className="font-medium text-amber-600 dark:text-amber-400 ml-1">{agentState?.replanCount ?? 0}</span>
          </span>
          <span className="flex items-center gap-1">
            <Shield size={9} className="text-blue-400" />
            Recoveries: <span className="font-medium text-blue-600 dark:text-blue-400 ml-1">{agentState?.recoveryCount ?? 0}</span>
          </span>
          <span className="flex items-center gap-1">
            Blocked: <span className={`font-medium ml-1 ${agentState?.goalProgress?.isBlocked ? "text-rose-500" : "text-emerald-500"}`}>
              {agentState?.goalProgress?.isBlocked ? "Yes" : "No"}
            </span>
          </span>
        </div>

        {/* Subgoal list */}
        {agentState?.goalProgress?.subGoals && agentState.goalProgress.subGoals.length > 0 && (
          <div className="mt-1.5 max-h-20 overflow-y-auto space-y-0.5">
            {agentState.goalProgress.subGoals.map((sg) => (
              <div key={sg.id} className="flex items-center gap-1 text-zinc-500">
                {sg.status === "completed" && <CheckCircle2 size={9} className="text-emerald-500 shrink-0" />}
                {sg.status === "failed" && <AlertTriangle size={9} className="text-rose-500 shrink-0" />}
                {sg.status === "running" && <RefreshCw size={9} className="text-indigo-500 shrink-0 animate-spin" />}
                {sg.status === "pending" && <span className="h-2 w-2 rounded-full border border-zinc-300 inline-block shrink-0" />}
                <span className="truncate text-[9px]">{sg.description}</span>
              </div>
            ))}
          </div>
        )}

        {/* Block reason */}
        {agentState?.goalProgress?.blockReason && (
          <div className="mt-1 text-[9px] text-rose-500 dark:text-rose-400 italic truncate">
            Blocked: {agentState.goalProgress.blockReason}
          </div>
        )}
      </div>

      {/* Execution timeline */}
      <div className="rounded border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="font-semibold text-zinc-700 dark:text-zinc-300">Execution Timeline</div>
        <div className="mt-1 max-h-24 overflow-y-auto space-y-1">
          {logs.slice(0, 8).map((log) => (
            <div key={log.id} className="flex items-center gap-1 text-zinc-500">
              {log.level === "error" ? <AlertTriangle size={10} className="text-rose-500 shrink-0" /> : <CheckCircle2 size={10} className="text-emerald-500 shrink-0" />}
              <span className="truncate">{log.action ?? "system"}: {log.message}</span>
            </div>
          ))}
          {logs.length === 0 && <span className="text-zinc-400">No execution logs yet.</span>}
        </div>
      </div>

      {/* Metrics */}
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

      {/* Memory snapshot */}
      <div className="rounded border border-zinc-200 bg-white p-2 dark:border-zinc-800 dark:bg-zinc-950">
        <div className="font-semibold text-zinc-700 dark:text-zinc-300">Memory Snapshot</div>
        <div className="mt-1 grid grid-cols-2 gap-1 text-zinc-500">
          <span>Saved jobs: {memory?.savedJobs.length ?? 0}</span>
          <span>Letters: {memory?.generatedCoverLetters.length ?? 0}</span>
          <span>Companies: {memory?.favoriteCompanies.length ?? 0}</span>
          <span>Successful: {memory?.successfulApplications.length ?? 0}</span>
        </div>
      </div>

      {/* Health */}
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
