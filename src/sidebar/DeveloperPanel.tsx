import { useState, useEffect } from "react";
import { Activity, AlertTriangle, CheckCircle2, RefreshCw, TrendingUp, Eye } from "lucide-react";
import type { AgentState } from "../shared/types/agent";
import type { AgentMetricRecord } from "../debug/AgentMetrics";
import type { ExecutionLogEntry } from "../debug/ExecutionLogger";
import type { HealthCheckResult } from "../ai/healthCheck";
import type { LongTermMemory } from "../types/Memory";
import type { VisualElement, VisualInteraction } from "../vision/VisionTypes";

interface DeveloperPanelProps {
  agentState: AgentState | null;
  logs: ExecutionLogEntry[];
  metrics: AgentMetricRecord[];
  memory: LongTermMemory | null;
  healthChecks: HealthCheckResult[];
}

export const DeveloperPanel = ({
  agentState,
  logs,
  metrics,
  memory,
  healthChecks
}: DeveloperPanelProps) => {
  const [activeTab, setActiveTab] = useState<"diagnostics" | "vision" | "ai">("diagnostics");

  // AI dynamic storage values
  const [aiStats, setAiStats] = useState<any[]>([]);
  const [fallbackEvents, setFallbackEvents] = useState<any[]>([]);
  const [activeConfig, setActiveConfig] = useState<any>(null);

  // Vision Runtime dynamic storage values
  const [visionData, setVisionData] = useState<{
    screenshot: string;
    elements: VisualElement[];
    target: string;
    confidence: number;
    visualMemory: VisualInteraction[];
  }>({
    screenshot: "",
    elements: [],
    target: "",
    confidence: 0,
    visualMemory: []
  });

  // Pull visual data from local storage on render & state updates
  useEffect(() => {
    const fetchVisionState = async () => {
      if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) return;
      const data = await chrome.storage.local.get([
        "lastScreenshot",
        "lastVisionElements",
        "lastVisionTarget",
        "lastVisionConfidence",
        "visualMemory",
        "aiHealthStats",
        "aiFallbackEvents"
      ]);
      const settingsData = await chrome.storage.sync.get("settings");
      
      setVisionData({
        screenshot: data.lastScreenshot || "",
        elements: data.lastVisionElements || [],
        target: data.lastVisionTarget || "",
        confidence: data.lastVisionConfidence || 0,
        visualMemory: data.visualMemory?.interactions || []
      });

      if (data.aiHealthStats) {
        try {
          const stats = JSON.parse(data.aiHealthStats);
          setAiStats(Object.values(stats));
        } catch {}
      }
      if (data.aiFallbackEvents) {
        try {
          setFallbackEvents(JSON.parse(data.aiFallbackEvents));
        } catch {}
      }
      if (settingsData.settings) {
        setActiveConfig(settingsData.settings);
      }
    };

    void fetchVisionState();
    
    // Set up a short polling check to sync coordinates dynamically during tool runs
    const handle = setInterval(fetchVisionState, 2000);
    return () => clearInterval(handle);
  }, [agentState]);

  return (
    <section className="border-b border-[var(--border-color)] bg-[var(--bg-primary)] p-3.5 text-[10px] text-[var(--text-secondary)] space-y-3 font-mono">
      {/* Title Header */}
      <div className="flex items-center justify-between font-bold uppercase tracking-wider text-[var(--text-muted)] font-mono border-b border-[var(--border-color)] pb-2">
        <div className="flex items-center gap-1.5">
          <Activity size={12} className="text-[#ff6b35]" />
          Developer Operations Console
        </div>
        <div className="flex gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab("diagnostics")}
            className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all border ${
              activeTab === "diagnostics"
                ? "bg-[#ff6b35]/10 border-[#ff6b35]/50 text-[#ff6b35]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Diagnostics
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("vision")}
            className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all border ${
              activeTab === "vision"
                ? "bg-[#ff6b35]/10 border-[#ff6b35]/50 text-[#ff6b35]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            Vision Runtime
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ai")}
            className={`px-1.5 py-0.5 rounded text-[8px] font-bold transition-all border ${
              activeTab === "ai"
                ? "bg-[#ff6b35]/10 border-[#ff6b35]/50 text-[#ff6b35]"
                : "border-transparent text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
            }`}
          >
            AI Engine
          </button>
        </div>
      </div>

            {activeTab === "diagnostics" && (
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
      )}

      {activeTab === "vision" && (
        <div className="space-y-3">
          {/* Screenshot Bounding box preview */}
          <div className="rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 font-mono">
            <div className="font-bold text-[var(--text-secondary)] uppercase text-[9px] tracking-wide border-b border-[var(--border-color)] pb-1.5 mb-2 flex items-center gap-1">
              <Eye size={10} className="text-[#ff6b35]" />
              Viewport Vision Analysis
            </div>
            
            <div className="relative w-full overflow-hidden border border-[var(--border-color)] bg-zinc-950 rounded-lg aspect-video flex items-center justify-center">
              {visionData.screenshot ? (
                <div className="relative w-full h-full">
                  <img
                    src={visionData.screenshot}
                    alt="Viewport Capture"
                    className="w-full h-full object-contain"
                  />
                  {visionData.elements.map((el) => (
                    <div
                      key={el.id}
                      className="absolute border border-rose-500 bg-rose-500/10 pointer-events-none"
                      style={{
                        top: `${el.bounds.ymin / 10}%`,
                        left: `${el.bounds.xmin / 10}%`,
                        width: `${(el.bounds.xmax - el.bounds.xmin) / 10}%`,
                        height: `${(el.bounds.ymax - el.bounds.ymin) / 10}%`
                      }}
                    >
                      <span className="absolute -top-3 left-0 bg-rose-600 text-white text-[5.5px] px-0.5 rounded leading-none whitespace-nowrap z-20">
                        {el.text || el.type} ({Math.round(el.confidence * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-zinc-500 italic text-[9px] flex items-center gap-1.5">
                  No screenshot analyzed yet. Trigger a visual action to capture.
                </div>
              )}
            </div>

            {/* Target and Confidence stats */}
            {visionData.screenshot && (
              <div className="mt-2.5 pt-2 border-t border-[var(--border-color)] grid grid-cols-2 gap-2 text-[9px]">
                <div>
                  Targeted Element: <strong className="text-[var(--text-primary)]">{visionData.target || "None"}</strong>
                </div>
                <div>
                  Vision Confidence: <strong className="text-[#ff6b35]">{Math.round(visionData.confidence * 100)}%</strong>
                </div>
              </div>
            )}
          </div>

          {/* Detected Elements list */}
          <div className="rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 font-mono">
            <div className="font-bold text-[var(--text-secondary)] uppercase text-[9px] tracking-wide border-b border-[var(--border-color)] pb-1 mb-1.5">
              Detected Layout Controls ({visionData.elements.length})
            </div>
            <div className="max-h-32 overflow-y-auto space-y-1 pr-1 custom-scrollbar text-[8.5px]">
              {visionData.elements.map((el) => (
                <div key={el.id} className="flex justify-between items-center py-0.5 border-b border-[var(--border-color)]/40 last:border-0">
                  <span className="text-[var(--text-primary)] font-semibold truncate max-w-[120px]" title={el.text}>
                    [{el.type.toUpperCase()}] {el.text || "Unnamed Element"}
                  </span>
                  <span className="text-[#ff6b35]">{Math.round(el.confidence * 100)}%</span>
                </div>
              ))}
              {visionData.elements.length === 0 && (
                <span className="text-zinc-500 italic">No controls detected on page.</span>
              )}
            </div>
          </div>

          {/* Visual Memory history */}
          <div className="rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 font-mono">
            <div className="font-bold text-[var(--text-secondary)] uppercase text-[9px] tracking-wide border-b border-[var(--border-color)] pb-1 mb-1.5">
              Visual Actions Interaction History
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1.5 text-[8.5px] pr-1 custom-scrollbar">
              {visionData.visualMemory.map((entry, idx) => (
                <div key={idx} className="border-b border-[var(--border-color)]/60 pb-1 mb-1 last:border-0 last:mb-0">
                  <div className="flex justify-between items-center">
                    <span className="font-bold uppercase text-[8px] text-[var(--text-primary)]">
                      {entry.action} - {entry.elementType}
                    </span>
                    <span className={entry.success ? "text-emerald-500" : "text-rose-500"}>
                      {entry.success ? "SUCCESS" : "FAIL"}
                    </span>
                  </div>
                  <div className="text-zinc-400 italic mt-0.5">Matched text: "{entry.elementText}"</div>
                  <div className="text-[7.5px] text-zinc-500 mt-0.5 truncate">{new Date(entry.timestamp).toLocaleTimeString()}</div>
                </div>
              ))}
              {visionData.visualMemory.length === 0 && (
                <span className="text-zinc-500 italic">No visual actions recorded yet.</span>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === "ai" && (
        <div className="grid grid-cols-1 gap-2.5 text-[10px]">
          {/* Active Configuration */}
          <div className="rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 font-mono">
            <div className="font-bold text-[var(--text-secondary)] uppercase text-[9px] tracking-wide border-b border-[var(--border-color)] pb-1 mb-1.5">
              Active Routing Setup
            </div>
            <div className="grid grid-cols-2 gap-1 text-[10px] text-[var(--text-secondary)]">
              <span>Provider: <strong className="text-[var(--text-primary)] uppercase">{activeConfig?.provider || "gemini"}</strong></span>
              <span>Model: <strong className="text-[var(--text-primary)] truncate block max-w-[100px]">{activeConfig?.model || "default"}</strong></span>
              <span>Fallback: <strong className="text-[var(--text-primary)] uppercase">{activeConfig?.fallbackProvider || "none"}</strong></span>
              <span>Streaming: <strong className="text-[var(--text-primary)]">{activeConfig?.streaming ? "Enabled" : "Disabled"}</strong></span>
              <span>Vision: <strong className="text-[var(--text-primary)] uppercase">{activeConfig?.visionProvider || "chat"}</strong></span>
              <span>Embedding: <strong className="text-[var(--text-primary)] uppercase">{activeConfig?.embeddingProvider || "chat"}</strong></span>
            </div>
          </div>

          {/* Performance & Metrics table */}
          <div className="rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 font-mono">
            <div className="font-bold text-[#ff6b35] uppercase text-[9px] tracking-wide border-b border-[var(--border-color)] pb-1 mb-1.5">
              Provider Metrics Monitoring
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1.5 text-[9px] text-[var(--text-secondary)] pr-1 custom-scrollbar">
              {aiStats.length > 0 ? (
                aiStats.map((stat, idx) => (
                  <div key={idx} className="border-b border-[var(--border-color)]/60 pb-1.5 last:border-0 last:pb-0 mb-1.5 last:mb-0">
                    <div className="flex justify-between items-center font-bold">
                      <span className="uppercase text-[var(--text-primary)]">{stat.provider}</span>
                      <span className={stat.isAvailable ? "text-emerald-500" : "text-rose-500"}>
                        {stat.isAvailable ? "ONLINE" : "OFFLINE"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 text-[8px] text-[var(--text-muted)] mt-0.5">
                      <span>Latency: {stat.averageLatencyMs}ms</span>
                      <span>Success/Fail: {stat.successCount}/{stat.failureCount}</span>
                      <span>Tokens: {stat.totalTokens}</span>
                      <span>Est. Cost: ${stat.totalCostEstimate.toFixed(5)}</span>
                    </div>
                  </div>
                ))
              ) : (
                <span className="text-[var(--text-muted)] italic">No provider calls logged yet.</span>
              )}
            </div>
          </div>

          {/* Fallback Routing events */}
          <div className="rounded border border-[var(--border-color)] bg-[var(--bg-secondary)] p-2.5 font-mono">
            <div className="font-bold text-[var(--text-secondary)] uppercase text-[9px] tracking-wide border-b border-[var(--border-color)] pb-1 mb-1.5">
              Fallback Routing Events
            </div>
            <div className="max-h-24 overflow-y-auto space-y-1.5 text-[9px] text-[var(--text-secondary)] pr-1 custom-scrollbar">
              {fallbackEvents.length > 0 ? (
                fallbackEvents.map((evt, idx) => (
                  <div key={idx} className="border-b border-[var(--border-color)]/60 pb-1 last:border-0 last:pb-0 mb-1 last:mb-0">
                    <div className="flex justify-between items-center font-bold text-[8px]">
                      <span className="text-rose-500 uppercase">{evt.fromProvider} ➔ {evt.toProvider}</span>
                      <span className="text-[var(--text-muted)] text-[7px]">{new Date(evt.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="italic text-[8px] text-[var(--text-muted)] mt-0.5 leading-snug">Reason: {evt.reason}</p>
                  </div>
                ))
              ) : (
                <span className="text-[var(--text-muted)] italic">No fallback events occurred.</span>
              )}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
