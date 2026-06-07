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

// Actions that are always trusted when they return a non-empty result.
// These produce text/data outputs that are correct by construction and do not
// benefit from AI re-evaluation. Evaluating them wastes a token call and risks
// spurious PARTIAL_SUCCESS signals that cascade into unwanted replanning.
const TRUSTED_ACTIONS: ActionType[] = [
  "chat_fallback",
  "extract_text",
  "save_job",
  "parse_resume",
  "generate_cover_letter",
  "research_company",
  "upload_resume",
  "navigate_page"
];

const INSTANT_SUCCESS: EvaluationResult = {
  success: true,
  confidence: 1.0,
  issues: [],
  recommendations: []
};

export const ActionEvaluator = {
  async evaluate(
    action: ActionType,
    result: string,
    pageContext?: PageSnapshot
  ): Promise<EvaluationResult> {
    // Hard failure: empty result or explicit error text
    if (!result || result.startsWith("Error:") || result.toLowerCase().startsWith("failed")) {
      return {
        success: false,
        confidence: 1.0,
        issues: [result || "Action produced no result or an error indicator."],
        recommendations: ["Check connection, reload the page, and retry."]
      };
    }

    // Fast-path for trusted actions: non-empty result means success
    if (TRUSTED_ACTIONS.includes(action)) {
      return INSTANT_SUCCESS;
    }

    // Heuristic short-circuit for structured JSON responses
    if (action === "match_resume") {
      try {
        const parsed = JSON.parse(result);
        if (parsed && typeof parsed.matchScore === "number") {
          return INSTANT_SUCCESS;
        }
      } catch {}
    }

    if (action === "extract_job") {
      try {
        const parsed = JSON.parse(result);
        if (parsed && (parsed.title || parsed.company)) {
          return INSTANT_SUCCESS;
        }
      } catch {}
    }

    // AI evaluation for high-stakes actions only (fill_form, click_element, fill_input)
    const prompt = `You are an AI Action Evaluator for Hunter, an autonomous browser agent.
Action performed: "${action}"
Resulting Output: "${result.slice(0, 1500)}"

Webpage Title: "${pageContext?.title || "Unknown"}"
Webpage URL: "${pageContext?.url || "Unknown"}"
Webpage Excerpt:
${pageContext?.content?.slice(0, 3000) || "No snapshot available"}

Evaluate whether the action accomplished its goal. For form-filling actions, check if essential inputs were populated. For navigation or element interaction, verify the interaction succeeded.
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
        success: typeof parsed.success === "boolean" ? parsed.success : true,
        confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
        issues: Array.isArray(parsed.issues) ? parsed.issues : [],
        recommendations: Array.isArray(parsed.recommendations) ? parsed.recommendations : []
      };
    } catch (err) {
      console.error("ActionEvaluator AI run failed, treating as success:", err);
      return INSTANT_SUCCESS;
    }
  }
};
