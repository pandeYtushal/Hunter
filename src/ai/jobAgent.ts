import { generateAiReply } from "./aiService";
import type { PageSnapshot } from "../shared/types/messages";
import { robustJsonParse } from "../shared/json";
import { PromptManager } from "./core/PromptManager";

export interface ExtractedJob {
  title: string;
  company: string;
  location: string;
  salary: string;
  experience: string;
  skills: string[];
}

export const extractJobDetails = async (pageContext: PageSnapshot): Promise<ExtractedJob> => {
  const prompt = PromptManager.getJobExtractPrompt();

  // Call AI Service using the existing generateAiReply function
  const responseText = await generateAiReply({
    prompt,
    history: [],
    pageContext
  });

  try {
    const parsed = robustJsonParse<Partial<ExtractedJob>>(responseText);
    return {
      title: parsed.title || "Unknown",
      company: parsed.company || "Unknown",
      location: parsed.location || "Unknown",
      salary: parsed.salary || "Unknown",
      experience: parsed.experience || "Unknown",
      skills: Array.isArray(parsed.skills) ? parsed.skills : []
    };
  } catch (error) {
    console.error("Failed to parse AI response as JSON. Raw response:", responseText, error);
    throw new Error("Failed to extract structured job details in the correct format.");
  }
};
