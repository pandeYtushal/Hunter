import { planUserGoal } from "../ai/planner";
import type { ExecutionPlan } from "../shared/types/agent";

export const GoalInterpreter = {
  /**
   * Interpret a natural language goal into a structured ExecutionPlan.
   */
  async interpret(goalText: string): Promise<ExecutionPlan> {
    if (!goalText || !goalText.trim()) {
      throw new Error("Goal text cannot be empty.");
    }
    return await planUserGoal(goalText);
  }
};
