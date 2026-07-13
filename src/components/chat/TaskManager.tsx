import React, { useState, useEffect } from "react";
import {
  Play, Pause, Trash2, RotateCw, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Loader2,
  AlertTriangle, Check, X, MousePointer, Keyboard, Search, Globe, Clock, Zap, Compass, Activity
} from "lucide-react";
import { Button } from "../ui/button";
import { ConcurrentScheduler, type ConcurrentTask } from "../../ai/concurrency/ConcurrentScheduler";
import { CopilotEngine, type CopilotState } from "../../copilot/CopilotEngine";
import { useChromeStorage } from "../../popup/hooks/useChromeStorage";
import { storage } from "../../shared/storage";

const getStepIcon = (name: string, description: string) => {
  const text = (name + " " + description).toLowerCase();
  if (text.includes("click")) return MousePointer;
  if (text.includes("type") || text.includes("fill") || text.includes("input")) return Keyboard;
  if (text.includes("search") || text.includes("find") || text.includes("extract") || text.includes("scan")) return Search;
  if (text.includes("navigate") || text.includes("go to") || text.includes("url") || text.includes("open")) return Globe;
  if (text.includes("wait") || text.includes("sleep") || text.includes("delay")) return Clock;
  if (text.includes("apply")) return Zap;
  if (text.includes("summarize") || text.includes("analyze") || text.includes("explain")) return Compass;
  return Activity;
};

export const TaskManager: React.FC = () => {
  const [tasks, setTasks] = useState<ConcurrentTask[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const { value: approvalState } = useChromeStorage("approvalState");
  const [copilot, setCopilot] = useState<CopilotState>({
    machineState: "idle",
    currentGoal: "",
    tasks: [],
    progress: 0,
    timeline: [],
    isBlocked: false,
    estimatedCompletionTimeSeconds: 0
  });

  const fetchTasks = async () => {
    const list = await ConcurrentScheduler.getTasks();
    setTasks(list);
  };

  useEffect(() => {
    const unsubscribe = CopilotEngine.getInstance().subscribe((state) => {
      setCopilot(state);
    });
    return () => {
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    fetchTasks();

    // Setup reactive storage observer
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes.concurrentTasks) {
        setTasks(changes.concurrentTasks.newValue || []);
      }
    };

    if (typeof chrome !== "undefined" && chrome.storage?.onChanged) {
      chrome.storage.onChanged.addListener(handleStorageChange);
      return () => {
        chrome.storage.onChanged.removeListener(handleStorageChange);
      };
    }
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "running": return "var(--accent)";
      case "paused": return "var(--warning)";
      case "completed": return "var(--success)";
      case "failed": return "var(--danger)";
      case "cancelled": return "var(--text-muted)";
      default: return "var(--text-secondary)";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "rgba(var(--danger-rgb), 0.15)";
      case "medium": return "rgba(var(--warning-rgb), 0.15)";
      case "low": return "rgba(var(--success-rgb), 0.15)";
      default: return "var(--border-color)";
    }
  };

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case "high": return "var(--danger)";
      case "medium": return "var(--warning)";
      case "low": return "var(--success)";
      default: return "var(--text-muted)";
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "var(--bg-primary)",
      color: "var(--text-primary)",
      fontFamily: "var(--font-sans)"
    }}>
      {/* Header */}
      <div style={{
        padding: "16px",
        borderBottom: "1px solid var(--border-color)",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <h2 style={{ fontSize: "14px", fontWeight: "bold", margin: 0, color: "var(--accent)", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Task Manager Dashboard
        </h2>
        <span style={{ fontSize: "10px", background: "var(--bg-tertiary)", padding: "2px 8px", borderRadius: "10px", color: "var(--text-secondary)" }}>
          {tasks.length} Active Tasks
        </span>
      </div>

      {/* Task List container */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {tasks.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60%", color: "var(--text-muted)" }}>
            <AlertCircle size={24} style={{ marginBottom: "8px" }} />
            <p style={{ fontSize: "12px", margin: 0 }}>No active or scheduled tasks.</p>
          </div>
        ) : (
          tasks.map((task) => {
            const isExpanded = expandedTaskId === task.id;
            return (
              <div key={task.id} style={{
                background: "var(--bg-secondary)",
                borderRadius: "8px",
                border: "1px solid var(--border-color)",
                overflow: "hidden",
                transition: "all 0.2s ease"
              }}>
                {/* Task Header info */}
                <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ fontSize: "12px", fontWeight: "600", margin: "0 0 4px 0", color: "var(--text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {task.goal}
                      </h4>
                      <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                        <span style={{
                          fontSize: "8.5px",
                          fontWeight: "bold",
                          textTransform: "uppercase",
                          padding: "1px 6px",
                          borderRadius: "4px",
                          background: getPriorityColor(task.priority),
                          color: getPriorityTextColor(task.priority)
                        }}>
                          {task.priority} priority
                        </span>
                        <span style={{
                          fontSize: "9px",
                          display: "flex",
                          alignItems: "center",
                          gap: "3px",
                          color: getStatusColor(task.status)
                        }}>
                          {task.status === "running" && <Loader2 size={10} style={{ animation: "spin 1s linear infinite" }} />}
                          {task.status === "completed" && <CheckCircle2 size={10} />}
                          <span style={{ fontWeight: "600", textTransform: "uppercase" }}>{task.status}</span>
                        </span>
                      </div>
                    </div>

                    {/* Progress Percent */}
                    <div style={{ textAlign: "right" }}>
                      <span style={{ fontSize: "12px", fontWeight: "bold", color: getStatusColor(task.status) }}>
                        {task.progress}%
                      </span>
                    </div>

                  </div>

                  {/* Progress Bar */}
                  <div style={{ height: "4px", width: "100%", background: "var(--bg-primary)", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${task.progress}%`,
                      background: getStatusColor(task.status),
                      transition: "width 0.4s ease-out"
                    }} />
                  </div>

                  {/* Control Actions bar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <Button
                      variant="ghost"
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      className="text-[var(--text-muted)] text-[10px] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]/50 px-2 py-1 h-auto flex items-center gap-1 cursor-pointer"
                    >
                      {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      {isExpanded ? "Hide activity log" : "View activity log"}
                    </Button>

                    <div style={{ display: "flex", gap: "6px" }}>
                      {task.status === "running" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => ConcurrentScheduler.pauseTask(task.id)}
                          className="h-7 w-7 rounded bg-[var(--bg-tertiary)] hover:bg-[var(--bg-tertiary)]/80 text-[var(--text-primary)] cursor-pointer"
                          aria-label="Pause task"
                        >
                          <Pause size={14} />
                        </Button>
                      )}
                      {task.status === "paused" && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => ConcurrentScheduler.resumeTask(task.id)}
                          className="h-7 w-7 rounded bg-[var(--accent)] hover:opacity-90 text-[var(--bg-primary)] cursor-pointer"
                          aria-label="Resume task"
                        >
                          <Play size={14} />
                        </Button>
                      )}
                      {(task.status === "running" || task.status === "paused" || task.status === "pending") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => ConcurrentScheduler.cancelTask(task.id)}
                          className="h-7 w-7 rounded bg-[var(--danger-faint)] hover:bg-[var(--danger)]/20 border border-[var(--danger)]/25 text-[var(--danger)] cursor-pointer"
                          aria-label="Cancel task"
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                      {(task.status === "failed" || task.status === "cancelled") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => ConcurrentScheduler.retryTask(task.id)}
                          className="h-7 w-7 rounded bg-[var(--accent)] hover:opacity-90 text-[var(--bg-primary)] cursor-pointer"
                          aria-label="Retry task"
                        >
                          <RotateCw size={14} />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Logs console */}
                {isExpanded && (
                  <div style={{
                    background: "var(--bg-primary)",
                    padding: "10px 12px",
                    borderTop: "1px solid var(--border-color)",
                    fontFamily: "var(--font-mono)",
                    fontSize: "9.5px",
                    color: "var(--text-secondary)",
                    maxHeight: "120px",
                    overflowY: "auto"
                  }}>
                    {task.logs.length === 0 ? (
                      <div>No log entries recorded.</div>
                    ) : (
                      task.logs.map((log, idx) => (
                        <div key={idx} style={{ marginBottom: "4px", borderBottom: "1px solid var(--border-color)", paddingBottom: "2px", color: log.toLowerCase().includes("fail") ? "var(--danger)" : "var(--text-secondary)" }}>
                          &gt; {log}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
      
      {/* Styles animation block */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      ` }} />
    </div>
  );
};
