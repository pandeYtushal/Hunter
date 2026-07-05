import React, { useState, useEffect } from "react";
import { Play, Pause, Trash2, RotateCw, ChevronDown, ChevronUp, AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { ConcurrentScheduler, type ConcurrentTask } from "../../ai/concurrency/ConcurrentScheduler";

export const TaskManager: React.FC = () => {
  const [tasks, setTasks] = useState<ConcurrentTask[]>([]);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const fetchTasks = async () => {
    const list = await ConcurrentScheduler.getTasks();
    setTasks(list);
  };

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
      case "running": return "#ff6b35";
      case "paused": return "#eab308";
      case "completed": return "#10b981";
      case "failed": return "#ef4444";
      case "cancelled": return "#71717a";
      default: return "#a1a1aa";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "rgba(239, 68, 68, 0.15)";
      case "medium": return "rgba(234, 179, 8, 0.15)";
      case "low": return "rgba(16, 185, 129, 0.15)";
      default: return "rgba(113, 113, 122, 0.15)";
    }
  };

  const getPriorityTextColor = (priority: string) => {
    switch (priority) {
      case "high": return "#f87171";
      case "medium": return "#facc15";
      case "low": return "#34d399";
      default: return "#a1a1aa";
    }
  };

  return (
    <div style={{
      display: "flex",
      flexDirection: "column",
      height: "100%",
      background: "#18181b",
      color: "#f4f4f5",
      fontFamily: "system-ui, -apple-system, sans-serif"
    }}>
      {/* Header */}
      <div style={{
        padding: "16px",
        borderBottom: "1px solid #27272a",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between"
      }}>
        <h2 style={{ fontSize: "14px", fontWeight: "bold", margin: 0, color: "#ff6b35", textTransform: "uppercase", letterSpacing: "0.5px" }}>
          Task Manager Dashboard
        </h2>
        <span style={{ fontSize: "10px", background: "#27272a", padding: "2px 8px", borderRadius: "10px", color: "#a1a1aa" }}>
          {tasks.length} Active Tasks
        </span>
      </div>

      {/* Task List container */}
      <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        {tasks.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "60%", color: "#71717a" }}>
            <AlertCircle size={24} style={{ marginBottom: "8px" }} />
            <p style={{ fontSize: "12px", margin: 0 }}>No active or scheduled tasks.</p>
          </div>
        ) : (
          tasks.map((task) => {
            const isExpanded = expandedTaskId === task.id;
            return (
              <div key={task.id} style={{
                background: "#27272a",
                borderRadius: "8px",
                border: "1px solid #3f3f46",
                overflow: "hidden",
                transition: "all 0.2s ease"
              }}>
                {/* Task Header info */}
                <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px" }}>
                    <div style={{ minWidth: 0 }}>
                      <h4 style={{ fontSize: "12px", fontWeight: "600", margin: "0 0 4px 0", color: "#f4f4f5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
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
                  <div style={{ height: "4px", width: "100%", background: "#18181b", borderRadius: "2px", overflow: "hidden" }}>
                    <div style={{
                      height: "100%",
                      width: `${task.progress}%`,
                      background: getStatusColor(task.status),
                      transition: "width 0.4s ease-out"
                    }} />
                  </div>

                  {/* Control Actions bar */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "4px" }}>
                    <button
                      onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                      style={{
                        background: "none",
                        border: "none",
                        color: "#a1a1aa",
                        fontSize: "10px",
                        display: "flex",
                        alignItems: "center",
                        gap: "2px",
                        cursor: "pointer",
                        padding: 0
                      }}
                    >
                      {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                      {isExpanded ? "Hide activity log" : "View activity log"}
                    </button>

                    <div style={{ display: "flex", gap: "6px" }}>
                      {task.status === "running" && (
                        <button
                          onClick={() => ConcurrentScheduler.pauseTask(task.id)}
                          style={{ background: "#3f3f46", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", color: "#f4f4f5" }}
                        >
                          <Pause size={10} />
                        </button>
                      )}
                      {task.status === "paused" && (
                        <button
                          onClick={() => ConcurrentScheduler.resumeTask(task.id)}
                          style={{ background: "#ff6b35", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", color: "#18181b" }}
                        >
                          <Play size={10} />
                        </button>
                      )}
                      {(task.status === "running" || task.status === "paused" || task.status === "pending") && (
                        <button
                          onClick={() => ConcurrentScheduler.cancelTask(task.id)}
                          style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.2)", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", color: "#ef4444" }}
                        >
                          <Trash2 size={10} />
                        </button>
                      )}
                      {(task.status === "failed" || task.status === "cancelled") && (
                        <button
                          onClick={() => ConcurrentScheduler.retryTask(task.id)}
                          style={{ background: "#ff6b35", border: "none", borderRadius: "4px", padding: "4px 8px", cursor: "pointer", display: "flex", alignItems: "center", color: "#18181b" }}
                        >
                          <RotateCw size={10} />
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded Logs console */}
                {isExpanded && (
                  <div style={{
                    background: "#18181b",
                    padding: "10px 12px",
                    borderTop: "1px solid #3f3f46",
                    fontFamily: "monospace",
                    fontSize: "9.5px",
                    color: "#a1a1aa",
                    maxHeight: "120px",
                    overflowY: "auto"
                  }}>
                    {task.logs.length === 0 ? (
                      <div>No log entries recorded.</div>
                    ) : (
                      task.logs.map((log, idx) => (
                        <div key={idx} style={{ marginBottom: "4px", borderBottom: "1px solid #27272a", paddingBottom: "2px", color: log.toLowerCase().includes("fail") ? "#f87171" : "#a1a1aa" }}>
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
