import type { Observation } from "./observationEngine";

export interface ReflectionResult {
  status: "success" | "replan" | "retry";
  reason?: string;
  nextAction?: string | null;
}

export const ReflectionEngine = {
  reflect(observation: Observation, attempt: number, maxAttempts: number = 3): ReflectionResult {
    const { status, evaluation } = observation;

    if (status === "SUCCESS") {
      return { status: "success", nextAction: null };
    }

    if (status === "PARTIAL_SUCCESS") {
      return {
        status: "replan",
        reason: `Action achieved partial success but has issues: ${evaluation.issues.join(", ")}`,
        nextAction: evaluation.recommendations[0] || null
      };
    }

    // Failure status
    if (attempt < maxAttempts) {
      return {
        status: "retry",
        reason: `Action failed: ${evaluation.issues.join(", ")}. Retrying attempt ${attempt + 1}.`
      };
    }

    // Failure with maximum attempts reached
    return {
      status: "replan",
      reason: `Action failed after ${attempt} attempts: ${evaluation.issues.join(", ")}`
    };
  }
};
