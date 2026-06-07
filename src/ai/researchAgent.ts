import { generateAiReply } from "./aiService";
import type { PageSnapshot } from "../shared/types/messages";
import { robustJsonParse } from "../shared/json";

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
  const prompt = `You are a professional company research agent. Research the company "${companyName}".
Using the provided page context if relevant (or your general knowledge), synthesize key professional insights about this company.
Return a clean, valid JSON object with the following keys. Do not include any markdown formatting, surrounding text, or explanation, just the raw JSON block:
{
  "companyOverview": "Brief overview of what the company does, its industry, scale, etc.",
  "keyProducts": "Core products, services, or divisions of the company.",
  "companyCulture": "Description of the public culture, core values, or work environment.",
  "interviewTips": "Helpful tips for interview prep, focus areas, or commonly assessed criteria at this company."
}`;

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
