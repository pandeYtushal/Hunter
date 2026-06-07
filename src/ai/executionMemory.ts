import type { ActionType } from "../types";

export interface MemoryPlanRecord {
  goal: string;
  plan: ActionType[];
  status: "success" | "failed";
  failures: { action: ActionType; reason: string }[];
  recoveryPlan?: ActionType[];
  timestamp: string;
}

export const ExecutionMemory = {
  async getMemory(): Promise<MemoryPlanRecord[]> {
    const data = await chrome.storage.local.get({ executionMemory: [] });
    return data.executionMemory as MemoryPlanRecord[];
  },

  async recordPlan(
    goal: string,
    plan: ActionType[],
    status: "success" | "failed",
    failures: { action: ActionType; reason: string }[],
    recoveryPlan?: ActionType[]
  ): Promise<void> {
    const memory = await ExecutionMemory.getMemory();
    const newRecord: MemoryPlanRecord = {
      goal,
      plan,
      status,
      failures,
      recoveryPlan,
      timestamp: new Date().toISOString()
    };
    await chrome.storage.local.set({ executionMemory: [newRecord, ...memory].slice(0, 50) });
  },

  async getContextForGoal(goal: string): Promise<string> {
    const memory = await ExecutionMemory.getMemory();
    const relevant = memory.filter((m) => m.goal.toLowerCase().includes(goal.toLowerCase())).slice(0, 3);

    if (relevant.length === 0) {
      return "No historical plan records for this goal type.";
    }

    return relevant
      .map((r, idx) => {
        return `Record #${idx + 1}:
Goal: ${r.goal}
Plan: ${r.plan.join(" -> ")}
Status: ${r.status}
Failures: ${r.failures.map((f) => `${f.action} (${f.reason})`).join(", ") || "None"}
${r.recoveryPlan ? `Recovery Plan: ${r.recoveryPlan.join(" -> ")}` : ""}`;
      })
      .join("\n\n");
  }
};
