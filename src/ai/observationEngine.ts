import { ActionEvaluator, type EvaluationResult } from "./actionEvaluator";
import type { PageSnapshot } from "../shared/types/messages";
import type { ActionType } from "../types";

export type ObservationResultStatus = "SUCCESS" | "PARTIAL_SUCCESS" | "FAILURE";

export interface Observation {
  action: ActionType;
  status: ObservationResultStatus;
  evaluation: EvaluationResult;
}

export const ObservationEngine = {
  async observe(
    action: ActionType,
    result: string,
    pageContext?: PageSnapshot
  ): Promise<Observation> {
    const evaluation = await ActionEvaluator.evaluate(action, result, pageContext);

    let status: ObservationResultStatus = "SUCCESS";
    if (!evaluation.success) {
      status = "FAILURE";
    } else if (evaluation.issues.length > 0) {
      status = "PARTIAL_SUCCESS";
    }

    return {
      action,
      status,
      evaluation
    };
  }
};
