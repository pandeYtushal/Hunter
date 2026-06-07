import { generateAiReply } from "./aiService";
import { robustJsonParse } from "../shared/json";
import type { PageSnapshot } from "../shared/types/messages";
import type { ActionType } from "../types";

export interface EvaluationResult {
  success: boolean;
  confidence: number;
  issues: string[];
  recommendations: string[];
}

export const ActionEvaluator = {
  async evaluate(
    action: ActionType,
    result: string,
    pageContext?: PageSnapshot
  ): Promise<EvaluationResult> {
    if (!result || result.startsWith("Error:") || result.toLowerCase().includes("failed")) {
      return {
        success: false,
        confidence: 1.0,
        issues: [result || "Action produced no result or an error indicator."],
        recommendations: ["Check connection, reload, and retry the action."]
      };
    }

    // Heuristic short-circuit for high-confidence structured cases
    if (action === "match_resume") {
      try {
        const parsed = JSON.parse(result);
        if (parsed && typeof parsed.matchScore === "number") {
          return {
            success: true,
            confidence: 1.0,
            issues: [],
            recommendations: []
          };
        }
      } catch {}
    }

    if (action === "save_job") {
      try {
        const parsed = JSON.parse(result);
        if (parsed && (parsed.company || parsed.title)) {
          return {
            success: true,
            confidence: 1.0,
            issues: [],
            recommendations: []
          };
        }
      } catch {}
    }

    // AI quality, DOM status, form completion, and page state evaluation
    const prompt = `You are an AI Action Evaluator for Hunter, an autonomous browser agent.
Action performed: "${action}"
Resulting Output: "${result.slice(0, 1500)}"

Webpage Title: "${pageContext?.title || "Unknown"}"
Webpage URL: "${pageContext?.url || "Unknown"}"
Webpage Excerpt:
${pageContext?.content?.slice(0, 3000) || "No snapshot available"}

Evaluate whether the action accomplished its goal. If it's a form-filling action, examine if essential inputs are populated or if fields are empty/highlighted. If it's navigation or element interaction, verify it succeeded.
Return a clean, valid JSON block. Do not include comments or markdown fences:
{
  "success": true,
  "confidence": 0.9,
  "issues": [],
  "recommendations": []
}`;

    try {
      const reply = await generateAiReply({ prompt, history: [] });
      const parsed = robustJsonParse<EvaluationResult>(reply);
      return {
        success: typeof parsed.success === "boolean" ? parsed.success : false,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
      };
    } catch (err) {
      console.error("ActionEvaluator AI run failed, falling back to heuristic success:", err);
      return {
        success: true,
        confidence: 0.5,
        issues: ["AI evaluation could not be processed."],
        recommendations: []
      };
    }
  }
};
