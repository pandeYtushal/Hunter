import { storage } from "../shared/storage";
import type { ActionType } from "../types/Action";
import type { AgentType } from "../types/Agent";

export interface AgentMetricRecord {
  agent: AgentType;
  action: ActionType;
  runs: number;
  failures: number;
  totalDurationMs: number;
}

export const AgentMetrics = {
  async record(agent: AgentType, action: ActionType, success: boolean, durationMs: number): Promise<void> {
    const metrics = await storage.get("agentMetrics");
    const key = `${agent}:${action}`;
    const current = metrics[key] ?? {
      agent,
      action,
      runs: 0,
      failures: 0,
      totalDurationMs: 0
    };

    await storage.set("agentMetrics", {
      ...metrics,
      [key]: {
        ...current,
        runs: current.runs + 1,
        failures: current.failures + (success ? 0 : 1),
        totalDurationMs: current.totalDurationMs + durationMs
      }
    });
  },

  async snapshot(): Promise<AgentMetricRecord[]> {
    return Object.values(await storage.get("agentMetrics"));
  }
};
