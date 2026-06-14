import { generateAiReply } from "./aiService";
import type { UserProfile } from "../shared/types/storage";
import { robustJsonParse } from "../shared/json";
import { PromptManager } from "./core/PromptManager";

export const parseResumeText = async (resumeText: string): Promise<UserProfile> => {
  const prompt = PromptManager.getResumeParsePrompt(resumeText);

  // Call AI Service by providing the prompt.
  const responseText = await generateAiReply({
    prompt,
    history: []
  });

  try {
    const parsed = robustJsonParse<Partial<UserProfile>>(responseText);
    return {
      name: parsed.name || "Unknown",
      email: parsed.email || "Unknown",
      phone: parsed.phone || "Unknown",
      linkedIn: parsed.linkedIn === "Unknown" ? "" : parsed.linkedIn || "",
      portfolio: parsed.portfolio === "Unknown" ? "" : parsed.portfolio || "",
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      experience: parsed.experience || "Unknown"
    };
  } catch (error) {
    console.error("Failed to parse AI response as JSON. Raw response:", responseText, error);
    throw new Error("Failed to parse resume text into structured format.");
  }
};
