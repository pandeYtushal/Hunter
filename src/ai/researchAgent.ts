import { generateAiReply } from "./aiService";
import type { PageSnapshot } from "../shared/types/messages";
import { robustJsonParse } from "../shared/json";
import { PromptManager } from "./core/PromptManager";

export interface ResearchData {
  companyOverview: string;
  keyProducts: string;
  companyCulture: string;
  interviewTips: string;
}

export const researchCompany = async (
  companyName: string,
  pageContext?: PageSnapshot
): Promise<ResearchData> => {
  const prompt = PromptManager.getResearchCompanyPrompt(companyName);

  const responseText = await generateAiReply({
    prompt,
    history: [],
    pageContext
  });

  try {
    const parsed = robustJsonParse<Partial<ResearchData>>(responseText);
    return {
      companyOverview: parsed.companyOverview || "Information not found.",
      keyProducts: parsed.keyProducts || "Information not found.",
      companyCulture: parsed.companyCulture || "Information not found.",
      interviewTips: parsed.interviewTips || "Information not found."
    };
  } catch (error) {
    console.error("Failed to parse AI response as JSON. Raw response:", responseText, error);
    throw new Error("Failed to synthesize company research details.");
  }
};
