import { generateAiReply } from "./aiService";
import { robustJsonParse } from "../shared/json";
import type { ActionType, ExecutionPlan } from "../types";

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
    const prompt = `You are a cognitive planning agent for an Autonomous Browser Job Search Assistant.
The user's goal is: "${goal}"
Current Plan: ${JSON.stringify(currentPlan.actions)}
Completed Steps: ${JSON.stringify(completedActions)}
Failed Action: "${failedAction}"
Failure Reason: "${failureReason}"
${memoryContext ? `Execution History Memory context:\n${memoryContext}` : ""}

Analyze this failure and generate a revised action list. Do not get stuck in a failure loop. If an action is blocked, you can use general webpage interaction fallback actions (like click_element, navigate_page, extract_text, fill_input) or skip unnecessary steps.

Available Actions:
- "extract_job": Read page HTML to extract structured job info.
- "match_resume": Synthesize resume skills alignment and match score.
- "generate_cover_letter": Generate tailored cover letter text.
- "fill_form": Run heuristic and FormAgent matches to populate input fields.
- "research_company": Pull company summary, culture, and interview prep tips.
- "save_job": Persist extracted job details into application tracking storage.
- "parse_resume": Extract candidate profile from resume text.
- "click_element": Click a specific link, button, or tab.
- "fill_input": Set the value of an input field.
- "extract_text": Extract clean raw page text.
- "navigate_page": Go to a target URL or section.
- "upload_resume": Highlight file inputs for resume manual uploads.
- "chat_fallback": General fallback chat answer.

Return a clean, valid JSON block specifying the new remaining action list to execute. Do not include comments or markdown fences:
{
  "newActions": ["action_1", "action_2", ...],
  "explanation": "Brief reasoning explaining how this plan recovers from the failure"
}`;

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
