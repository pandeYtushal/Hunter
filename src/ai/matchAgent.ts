import { generateAiReply } from "./aiService";
import type { PageSnapshot } from "../shared/types/messages";
import type { UserProfile } from "../shared/types/storage";
import { robustJsonParse } from "../shared/json";

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
  const prompt = `You are an expert career coaching agent. Compare the user's profile/resume details with the job description page context.
Perform a semantic comparison of skills and experience. Calculate a match score between 0 and 100 based on how well the candidate matches the job requirements.
List matched skills, missing skills, and provide specific, actionable coaching recommendations on how to bridge any gaps.

User Profile:
- Name: ${profile.name || "Unknown"}
- Skills: ${profile.skills.join(", ") || "None listed"}
- Experience: ${profile.experience || "None listed"}

Job Page Context:
- Title: ${pageContext.title}
- Content: ${pageContext.content || "No page content available"}
- Description: ${pageContext.description || "No description available"}

Return a clean, valid JSON object with the following keys. Do not include any markdown formatting, surrounding text, or explanation, just the raw JSON block:
{
  "matchScore": number (0 to 100),
  "matchedSkills": ["Skill 1", "Skill 2", ...],
  "missingSkills": ["Skill A", "Skill B", ...],
  "recommendations": "Actionable coaching recommendations for the candidate."
}`;

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
