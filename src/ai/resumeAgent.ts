import { generateAiReply } from "./aiService";
import type { UserProfile } from "../shared/types/storage";
import { robustJsonParse } from "../shared/json";

export const parseResumeText = async (resumeText: string): Promise<UserProfile> => {
  const prompt = `You are an expert resume parser agent. Parse the following resume text and extract the requested fields.
Return a clean, valid JSON object with the following keys. Do not include any markdown formatting, surrounding text, or explanation, just the raw JSON block:
{
  "name": "Candidate Name (or 'Unknown')",
  "email": "Email Address (or 'Unknown')",
  "phone": "Phone Number (or 'Unknown')",
  "linkedIn": "LinkedIn URL if found (or 'Unknown')",
  "portfolio": "Portfolio or personal website URL if found (or 'Unknown')",
  "skills": ["Skill 1", "Skill 2", ...] (an array of skills/technologies),
  "experience": "A clear description/summary of work history (or 'Unknown')"
}

Resume Text:
${resumeText}`;

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
