import { generateAiReply } from "./aiService";
import type { PageSnapshot } from "../shared/types/messages";
import type { UserProfile } from "../shared/types/storage";
import { robustJsonParse } from "../shared/json";
import { PromptManager } from "./core/PromptManager";

export interface GeneratedCoverLetter {
  company: string;
  role: string;
  coverLetter: string;
}

export const generateCoverLetter = async (
  pageContext: PageSnapshot,
  profile: UserProfile
): Promise<GeneratedCoverLetter> => {
  const prompt = PromptManager.getCoverLetterPrompt(profile, pageContext);

  const responseText = await generateAiReply({
    prompt,
    history: [],
    pageContext
  });

  try {
    const parsed = robustJsonParse<Partial<GeneratedCoverLetter>>(responseText);
    return {
      company: parsed.company || pageContext.host || "the Company",
      role: parsed.role || pageContext.title || "Job Role",
      coverLetter: parsed.coverLetter || responseText
    };
  } catch (error) {
    console.error("Failed to parse cover letter response as JSON. Raw response:", responseText, error);
    // Fallback in case AI returns raw text instead of JSON
    return {
      company: pageContext.host || "the Company",
      role: pageContext.title || "Job Role",
      coverLetter: responseText
    };
  }
};
