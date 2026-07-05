import { SelfHealing } from "../selfHealing";
import type { ActionQueue } from "./ActionQueue";
import type { ActionType } from "../../types/Action";
import type { ExecutionPlan } from "../../shared/types/agent";
import type { PageSnapshot } from "../../shared/types/messages";

export class AutomationRetry {
  static async applyBackoff(attempt: number): Promise<void> {
    const baseDelay = 350;
    const exponential = Math.pow(2, attempt - 1) * baseDelay;
    const jitter = Math.random() * 150;
    const delay = Math.min(3000, exponential + jitter); // capped at 3s for MV3 compatibility
    
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  static async handleFailure(
    goal: string,
    currentPlan: ExecutionPlan,
    failedAction: ActionType,
    failureReason: string,
    attempt: number,
    queue: ActionQueue,
    pageContext?: PageSnapshot
  ): Promise<{ strategy: "retry" | "fallback" | "replan" | "abort"; explanation: string }> {
    
    // Apply local fallback or trigger dynamic AI-driven replanning
    const healing = await SelfHealing.heal(
      goal,
      currentPlan,
      failedAction,
      failureReason,
      attempt,
      queue.getCompleted(),
      pageContext
    );

    if (healing.strategy === "fallback" || healing.strategy === "replan") {
      if (healing.newActions && healing.newActions.length > 0) {
        queue.insert(healing.newActions);
      }
    }

    return {
      strategy: healing.strategy as any,
      explanation: healing.explanation
    };
  }
}
