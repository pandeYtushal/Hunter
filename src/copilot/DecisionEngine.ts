import { ObservationEngine } from "../ai/observationEngine";
import { ReflectionEngine } from "../ai/reflectionEngine";
import type { ActionType } from "../shared/types/agent";
import type { PageSnapshot } from "../shared/types/messages";

export interface DecisionOutcome {
  decision: "continue" | "retry" | "replan" | "complete" | "fail";
  reason: string;
}

export const DecisionEngine = {
  /**
   * Evaluate the result of a tool run and decide the next cognitive state transition.
   */
  async evaluate(
    action: ActionType,
    resultText: string,
    pageContext: PageSnapshot | undefined,
    currentAttempt: number,
    retryLimit = 3
  ): Promise<DecisionOutcome> {
    try {
      const observation = await ObservationEngine.observe(action, resultText, pageContext);
      const reflection = ReflectionEngine.reflect(observation, currentAttempt, retryLimit);

      if (reflection.status === "success") {
        return {
          decision: "continue",
          reason: `Observation resolved as success. Status: ${observation.status}`
        };
      }

      if (reflection.status === "retry") {
        return {
          decision: "retry",
          reason: `Action reflection suggested retry. Attempt: ${currentAttempt}/${retryLimit}. Reason: ${reflection.reason}`
        };
      }

      if (reflection.status === "replan") {
        return {
          decision: "replan",
          reason: `Action failed. Triggering recovery replanning. Reason: ${reflection.reason}`
        };
      }

      return {
        decision: "fail",
        reason: reflection.reason || "Action failed without recovery pathways."
      };

    } catch (err: any) {
      console.error("DecisionEngine failed evaluation:", err);
      return {
        decision: "retry",
        reason: `Evaluation error: ${err.message}. Defaulting to retry.`
      };
    }
  }
};
