import React, { useState, useEffect } from "react";
import { Plus, Play, Trash2, ShieldAlert, Check, X, ClipboardList, HelpCircle } from "lucide-react";
import { WorkflowEngine, type WorkflowStep, type Workflow, type WorkflowRunLog } from "../../ai/workflows/WorkflowEngine";

export const WorkflowBuilder: React.FC = () => {
  const [workflowName, setWorkflowName] = useState("My Browser Automation Workflow");
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { id: "1", type: "navigate", params: { url: "https://careers.google.com" } },
    { id: "2", type: "approval", params: { prompt: "Verify we loaded the careers portal?" } }
  ]);
  const [history, setHistory] = useState<WorkflowRunLog[]>([]);
  const [pendingApproval, setPendingApproval] = useState<{ runId: string; prompt: string } | null>(null);

  const fetchHistory = async () => {
    const list = await WorkflowEngine.getHistory();
    setHistory(list);

    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const data = await chrome.storage.local.get("workflowPendingApproval");
      setPendingApproval(data?.workflowPendingApproval || null);
    }
  };

  useEffect(() => {
    fetchHistory();
    const interval = setInterval(fetchHistory, 1500);
    return () => clearInterval(interval);
  }, []);

  const handleAddStep = (type: WorkflowStep["type"]) => {
    const id = Math.random().toString(36).substring(2, 9);
    let defaultParams = {};
    if (type === "navigate") defaultParams = { url: "https://example.com" };
    if (type === "click") defaultParams = { selector: "button.submit" };
    if (type === "fill") defaultParams = { selector: "input[name='search']", value: "query_value" };
    if (type === "extract") defaultParams = { selector: "h1", conditionKey: "extracted_header" };
    if (type === "wait") defaultParams = { duration: 2000 };
    if (type === "approval") defaultParams = { prompt: "Confirm execution flow?" };
    if (type === "condition") defaultParams = { conditionKey: "extracted_header", conditionValue: "Success", value: "[]" };
    if (type === "loop") defaultParams = { loopCount: 3, value: "[]" };

    setSteps([...steps, { id, type, params: defaultParams }]);
  };

  const handleRemoveStep = (id: string) => {
    setSteps(steps.filter((s) => s.id !== id));
  };

  const handleParamChange = (id: string, key: string, val: any) => {
    setSteps(
      steps.map((s) => {
        if (s.id === id) {
          return {
            ...s,
            params: { ...s.params, [key]: val }
          };
        }
        return s;
      })
    );
  };

  const handleRun = async () => {
    const workflow: Workflow = {
      id: Math.random().toString(36).substring(2, 9),
      name: workflowName,
      steps,
      variables: {}
    };
    await WorkflowEngine.run(workflow);
    void fetchHistory();
  };

  const handleApprovalResponse = async (approved: boolean) => {
    if (!pendingApproval || typeof chrome === "undefined" || !chrome.storage?.local) return;
    await chrome.storage.local.set({
      workflowApprovalResponse: { runId: pendingApproval.runId, approved }
    });
    setPendingApproval(null);
  };

  return (
    <div style={{
      padding: "16px",
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      background: "#18181b",
      color: "#f4f4f5",
      fontFamily: "system-ui, -apple-system, sans-serif",
      fontSize: "12px",
      minHeight: "100%"
    }}>
      {/* Workflow Metadata */}
      <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
        <input
          value={workflowName}
          onChange={(e) => setWorkflowName(e.target.value)}
          style={{
            flex: 1,
            background: "#27272a",
            border: "1px solid #3f3f46",
            borderRadius: "6px",
            padding: "6px 12px",
            color: "#f4f4f5",
            fontSize: "12px",
            outline: "none"
          }}
        />
        <button
          onClick={handleRun}
          style={{
            background: "#ff6b35",
            border: "none",
            borderRadius: "6px",
            color: "#18181b",
            padding: "6px 12px",
            cursor: "pointer",
            fontWeight: "bold",
            display: "flex",
            alignItems: "center",
            gap: "4px"
          }}
        >
          <Play size={12} fill="#18181b" /> Run
        </button>
      </div>

      {/* Human Approval Alert Panel */}
      {pendingApproval && (
        <div style={{
          background: "#3f1a1a",
          border: "1px solid #ef4444",
          borderRadius: "8px",
          padding: "12px",
          display: "flex",
          flexDirection: "column",
          gap: "8px"
        }}>
          <div style={{ display: "flex", gap: "6px", alignItems: "center", color: "#f87171", fontWeight: "bold" }}>
            <ShieldAlert size={14} /> Human Approval Required
          </div>
          <div style={{ fontSize: "11px", color: "#fca5a5" }}>{pendingApproval.prompt}</div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => handleApprovalResponse(true)}
              style={{
                flex: 1,
                background: "#10b981",
                color: "#18181b",
                border: "none",
                borderRadius: "4px",
                padding: "4px",
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px"
              }}
            >
              <Check size={12} /> Approve
            </button>
            <button
              onClick={() => handleApprovalResponse(false)}
              style={{
                flex: 1,
                background: "#ef4444",
                color: "#ffffff",
                border: "none",
                borderRadius: "4px",
                padding: "4px",
                cursor: "pointer",
                fontWeight: "bold",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "4px"
              }}
            >
              <X size={12} /> Reject
            </button>
          </div>
        </div>
      )}

      {/* Steps Editor Stack */}
      <div style={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: "8px", padding: "12px" }}>
        <h3 style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#ff6b35", margin: "0 0 12px 0" }}>
          Workflow Blocks Stack
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          {steps.map((step, idx) => (
            <div key={step.id} style={{
              background: "#18181b",
              border: "1px solid #3f3f46",
              borderRadius: "6px",
              padding: "10px",
              display: "flex",
              flexDirection: "column",
              gap: "8px",
              position: "relative"
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: "bold", color: "#a1a1aa" }}>#{idx + 1} {step.type.toUpperCase()}</span>
                <button
                  onClick={() => handleRemoveStep(step.id)}
                  style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: 0 }}
                >
                  <Trash2 size={12} />
                </button>
              </div>

              {/* Dynamic Parameter Fields */}
              {step.type === "navigate" && (
                <input
                  value={step.params.url || ""}
                  onChange={(e) => handleParamChange(step.id, "url", e.target.value)}
                  placeholder="URL e.g., https://gmail.com"
                  style={{ background: "#27272a", border: "1px solid #3f3f46", color: "#f4f4f5", fontSize: "11px", padding: "4px 8px", borderRadius: "4px", outline: "none" }}
                />
              )}

              {step.type === "click" && (
                <input
                  value={step.params.selector || ""}
                  onChange={(e) => handleParamChange(step.id, "selector", e.target.value)}
                  placeholder="CSS Selector e.g., button.submit"
                  style={{ background: "#27272a", border: "1px solid #3f3f46", color: "#f4f4f5", fontSize: "11px", padding: "4px 8px", borderRadius: "4px", outline: "none" }}
                />
              )}

              {step.type === "fill" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <input
                    value={step.params.selector || ""}
                    onChange={(e) => handleParamChange(step.id, "selector", e.target.value)}
                    placeholder="CSS Input Selector"
                    style={{ background: "#27272a", border: "1px solid #3f3f46", color: "#f4f4f5", fontSize: "11px", padding: "4px 8px", borderRadius: "4px", outline: "none" }}
                  />
                  <input
                    value={step.params.value || ""}
                    onChange={(e) => handleParamChange(step.id, "value", e.target.value)}
                    placeholder="Text value (supports {{variable}})"
                    style={{ background: "#27272a", border: "1px solid #3f3f46", color: "#f4f4f5", fontSize: "11px", padding: "4px 8px", borderRadius: "4px", outline: "none" }}
                  />
                </div>
              )}

              {step.type === "extract" && (
                <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                  <input
                    value={step.params.selector || ""}
                    onChange={(e) => handleParamChange(step.id, "selector", e.target.value)}
                    placeholder="CSS Element Selector"
                    style={{ background: "#27272a", border: "1px solid #3f3f46", color: "#f4f4f5", fontSize: "11px", padding: "4px 8px", borderRadius: "4px", outline: "none" }}
                  />
                  <input
                    value={step.params.conditionKey || ""}
                    onChange={(e) => handleParamChange(step.id, "conditionKey", e.target.value)}
                    placeholder="Variable name to save content to"
                    style={{ background: "#27272a", border: "1px solid #3f3f46", color: "#f4f4f5", fontSize: "11px", padding: "4px 8px", borderRadius: "4px", outline: "none" }}
                  />
                </div>
              )}

              {step.type === "wait" && (
                <input
                  type="number"
                  value={step.params.duration || 1000}
                  onChange={(e) => handleParamChange(step.id, "duration", parseInt(e.target.value) || 1000)}
                  placeholder="Duration (ms)"
                  style={{ background: "#27272a", border: "1px solid #3f3f46", color: "#f4f4f5", fontSize: "11px", padding: "4px 8px", borderRadius: "4px", outline: "none" }}
                />
              )}

              {step.type === "approval" && (
                <input
                  value={step.params.prompt || ""}
                  onChange={(e) => handleParamChange(step.id, "prompt", e.target.value)}
                  placeholder="Approval prompt description"
                  style={{ background: "#27272a", border: "1px solid #3f3f46", color: "#f4f4f5", fontSize: "11px", padding: "4px 8px", borderRadius: "4px", outline: "none" }}
                />
              )}
            </div>
          ))}
        </div>

        {/* Action triggers to add steps */}
        <div style={{ marginTop: "12px", borderTop: "1px solid #3f3f46", paddingTop: "12px" }}>
          <span style={{ fontSize: "10px", color: "#a1a1aa", display: "block", marginBottom: "6px" }}>ADD AUTOMATION STEP:</span>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {(["navigate", "click", "fill", "extract", "wait", "approval"] as const).map((type) => (
              <button
                key={type}
                onClick={() => handleAddStep(type)}
                style={{
                  background: "#18181b",
                  border: "1px solid #3f3f46",
                  color: "#f4f4f5",
                  borderRadius: "4px",
                  padding: "4px 8px",
                  cursor: "pointer",
                  fontSize: "10.5px",
                  display: "flex",
                  alignItems: "center",
                  gap: "2px"
                }}
              >
                <Plus size={10} /> {type.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Execution Logs */}
      <div style={{ background: "#27272a", border: "1px solid #3f3f46", borderRadius: "8px", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
        <h3 style={{ fontSize: "11px", fontWeight: "bold", textTransform: "uppercase", color: "#ff6b35", margin: "0", display: "flex", alignItems: "center", gap: "4px" }}>
          <ClipboardList size={12} /> Execution History
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "150px", overflowY: "auto" }}>
          {history.length === 0 ? (
            <div style={{ color: "#71717a", fontSize: "10px" }}>No previous executions logged.</div>
          ) : (
            history.map((log) => (
              <div key={log.runId} style={{ background: "#18181b", border: "1px solid #3f3f46", borderRadius: "4px", padding: "6px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                  <span style={{ fontWeight: "bold" }}>{log.name}</span>
                  <span style={{
                    fontSize: "9px",
                    fontWeight: "bold",
                    color: log.status === "completed" ? "#10b981" : log.status === "failed" ? "#ef4444" : "#ff6b35"
                  }}>{log.status.toUpperCase()}</span>
                </div>
                <div style={{ fontSize: "10px", color: "#a1a1aa", fontFamily: "monospace", display: "flex", flexDirection: "column", gap: "2px" }}>
                  {log.logs.slice(-3).map((l, i) => (
                    <div key={i}>&gt; {l}</div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
