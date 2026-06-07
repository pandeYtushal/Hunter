import type { ActionType } from "../types";
import { Replanner } from "./replanner";
import type { ExecutionPlan } from "../types";
import type { PageSnapshot } from "../shared/types/messages";

export type HealingStrategy = "retry" | "fallback" | "replan";

export interface HealingResult {
  strategy: HealingStrategy;
  newActions?: ActionType[];
  explanation: string;
}

// Fallback action map: if a primary action fails, try these alternatives in order
const fallbackMap: Partial<Record<ActionType, ActionType[]>> = {
  fill_form: ["click_element", "fill_input", "extract_text"],
  extract_job: ["extract_text", "chat_fallback"],
  click_element: ["fill_input", "navigate_page"],
  navigate_page: ["click_element", "extract_text"],
  match_resume: ["extract_text", "chat_fallback"],
  generate_cover_letter: ["chat_fallback"],
  research_company: ["extract_text", "chat_fallback"]
};

export const SelfHealing = {
  getFallbackActions(failedAction: ActionType): ActionType[] {
    return fallbackMap[failedAction] ?? [];
  },

  async heal(
    goal: string,
    currentPlan: ExecutionPlan,
    failedAction: ActionType,
    failureReason: string,
    attempt: number,
    completedActions: ActionType[],
    pageContext?: PageSnapshot,
    memoryContext?: string
  ): Promise<HealingResult> {
    // Tier 1: Simple retry (handled by caller, just signal it)
    if (attempt === 1) {
      return {
        strategy: "retry",
        explanation: `Retrying action "${failedAction}" after first failure.`
      };
    }

    // Tier 2: Fallback to an alternative action
    const fallbacks = SelfHealing.getFallbackActions(failedAction);
    if (attempt === 2 && fallbacks.length > 0) {
      const fallbackAction = fallbacks[0];
      const remainingOriginalActions = currentPlan.actions
        .filter((a) => !completedActions.includes(a) && a !== failedAction);
      const newActions: ActionType[] = [fallbackAction, ...remainingOriginalActions];

      return {
        strategy: "fallback",
        newActions,
        explanation: `Substituting failed action "${failedAction}" with fallback action "${fallbackAction}".`
      };
    }

    // Tier 3: Full AI-driven replanning
    const replanResult = await Replanner.replan(
      goal,
      currentPlan,
      failedAction,
      failureReason,
      completedActions,
      memoryContext
    );

    return {
      strategy: "replan",
      newActions: replanResult.newActions,
      explanation: replanResult.explanation
    };
  }
};
