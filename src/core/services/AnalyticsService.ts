import { AgentMetrics } from "../../debug/AgentMetrics";
import { LoggerService } from "./LoggerService";
import type { AgentType } from "../../types/Agent";
import type { ActionType } from "../../types/Action";

export interface ExecutionEvent {
  eventName: string;
  timestamp: string;
  durationMs?: number;
  metadata?: Record<string, unknown>;
}

export class AnalyticsService {
  static async trackPerformance(
    agent: AgentType,
    action: ActionType,
    success: boolean,
    durationMs: number
  ): Promise<void> {
    try {
      await AgentMetrics.record(agent, action, success, durationMs);
      LoggerService.debug(`[Telemetry] Recorded performance for ${agent}:${action} in ${durationMs}ms. Success: ${success}`);
    } catch (err) {
      LoggerService.error("Failed to record analytics event", err);
    }
  }

  static trackEvent(eventName: string, durationMs?: number, metadata?: Record<string, unknown>): void {
    const event: ExecutionEvent = {
      eventName,
      timestamp: new Date().toISOString(),
      durationMs,
      metadata
    };
    LoggerService.debug(`[Telemetry Event] ${eventName}`, event);
  }
}
