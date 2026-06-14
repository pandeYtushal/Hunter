import { generateAiReply } from "./aiService";
import type { PageSnapshot } from "../shared/types/messages";
import type { UserProfile } from "../shared/types/storage";
import { robustJsonParse } from "../shared/json";
import { PromptManager } from "./core/PromptManager";

export interface MatchAnalysis {
  matchScore: number;
  matchedSkills: string[];
  missingSkills: string[];
  recommendations: string;
}

export const analyzeJobFit = async (
  pageContext: PageSnapshot,
  profile: UserProfile
): Promise<MatchAnalysis> => {
  const prompt = PromptManager.getMatchAnalysisPrompt(profile, pageContext);

  const responseText = await generateAiReply({
    prompt,
    history: [],
    pageContext
  });

  try {
    const parsed = robustJsonParse<Partial<MatchAnalysis>>(responseText);
    return {
      matchScore: typeof parsed.matchScore === "number" ? parsed.matchScore : 0,
      matchedSkills: Array.isArray(parsed.matchedSkills) ? parsed.matchedSkills : [],
      missingSkills: Array.isArray(parsed.missingSkills) ? parsed.missingSkills : [],
      recommendations: parsed.recommendations || "No recommendations generated."
    };
  } catch (error) {
    console.error("Failed to parse match analysis response as JSON. Raw response:", responseText, error);
    throw new Error("Failed to generate match analysis in the correct format.");
  }
};
