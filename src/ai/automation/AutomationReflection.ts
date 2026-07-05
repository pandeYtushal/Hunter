import { ReflectionEngine } from "../reflectionEngine";
import { ObservationEngine } from "../observationEngine";
import type { ActionType } from "../../types/Action";
import type { PageSnapshot } from "../../shared/types/messages";

export interface ReflectionResult {
  status: "success" | "retry" | "replan";
  reason?: string;
}

export class AutomationReflection {
  static async reflect(
    action: ActionType,
    resultText: string,
    pageContext?: PageSnapshot,
    attempt: number = 1,
    retryLimit: number = 3
  ): Promise<ReflectionResult> {
    
    // 1. Generate structured execution observations
    const observation = await ObservationEngine.observe(action, resultText, pageContext);
    
    // 2. Determine workflow state through ReflectionEngine
    const reflection = ReflectionEngine.reflect(observation, attempt, retryLimit);

    if (reflection.status === "success") {
      return { status: "success" };
    } else if (reflection.status === "retry") {
      return { status: "retry", reason: reflection.reason || "Retry required." };
    } else {
      return { status: "replan", reason: reflection.reason || "Action failure requires replanning." };
    }
  }
}
