import { ExecutionLogger } from "../debug/ExecutionLogger";
import { AgentMetrics } from "../debug/AgentMetrics";
import type { ActionType, AgentType } from "../shared/types/agent";

export class WorkflowMonitor {
  private startTime = 0;
  private durationMs = 0;
  private failureCount = 0;
  private successCount = 0;

  startTimer(): void {
    this.startTime = performance.now();
  }

  stopTimer(): number {
    if (this.startTime === 0) return 0;
    this.durationMs = Math.round(performance.now() - this.startTime);
    this.startTime = 0;
    return this.durationMs;
  }

  async recordStep(
    agent: AgentType,
    action: ActionType,
    success: boolean,
    durationMs: number,
    logMsg: string
  ): Promise<void> {
    if (success) {
      this.successCount++;
    } else {
      this.failureCount++;
    }

    await AgentMetrics.record(agent, action, success, durationMs).catch(() => null);
    await ExecutionLogger.log({
      level: success ? "info" : "warn",
      action,
      durationMs,
      message: logMsg
    }).catch(() => null);
  }

  getStats() {
    return {
      durationMs: this.durationMs,
      successCount: this.successCount,
      failureCount: this.failureCount,
      totalCount: this.successCount + this.failureCount
    };
  }
}
