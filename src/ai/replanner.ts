import { generateAiReply } from "./aiService";
import { robustJsonParse } from "../shared/json";
import type { ActionType, ExecutionPlan } from "../types";
import { PromptManager } from "./core/PromptManager";

export interface ReplanResult {
  newActions: ActionType[];
  explanation: string;
}

export const Replanner = {
  async replan(
    goal: string,
    currentPlan: ExecutionPlan,
    failedAction: ActionType,
    failureReason: string,
    completedActions: ActionType[],
    memoryContext?: string
  ): Promise<ReplanResult> {
    const prompt = PromptManager.getReplannerPrompt(
      goal,
      currentPlan.actions,
      completedActions,
      failedAction,
      failureReason,
      memoryContext
    );

    try {
      const responseText = await generateAiReply({
        prompt,
        history: []
      });
      const parsed = robustJsonParse<Partial<ReplanResult>>(responseText);
      const newActions = Array.isArray(parsed.newActions)
        ? (parsed.newActions.filter((a) => typeof a === "string") as ActionType[])
        : currentPlan.actions;
      return {
        newActions: newActions.length > 0 ? newActions : currentPlan.actions,
        explanation: parsed.explanation || "Reconstructed workflow steps."
      };
    } catch (error) {
      console.error("Replanner failed to fetch/parse recovery options, returning fallback plan:", error);
      // Fallback: remove the failed action and continue
      return {
        newActions: currentPlan.actions.filter((a) => a !== failedAction),
        explanation: `Skipped failed action "${failedAction}" due to parsing error.`
      };
    }
  }
};
