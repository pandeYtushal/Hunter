import { generateAiReply } from "./aiService";
import type { PageSnapshot } from "../shared/types/messages";
import type { UserProfile } from "../shared/types/storage";
import { robustJsonParse } from "../shared/json";

export interface GeneratedCoverLetter {
  company: string;
  role: string;
  coverLetter: string;
}

export const generateCoverLetter = async (
  pageContext: PageSnapshot,
  profile: UserProfile
): Promise<GeneratedCoverLetter> => {
  const prompt = `You are an expert career coaching agent. Write a professional, concise, and highly tailored cover letter for the candidate applying to the job page context.
Use the candidate's name, email, phone, skills, and work experience from their profile, and align them with the job requirements. Keep it professional and follow standard cover letter structures (salutations, opening pitch, alignment body, closing call to action, and formal signature).

User Profile:
- Name: ${profile.name || "Candidate"}
- Email: ${profile.email || ""}
- Phone: ${profile.phone || ""}
- Skills: ${profile.skills.join(", ") || ""}
- Experience: ${profile.experience || ""}

Job Context:
- Title/Role: ${pageContext.title}
- Company/Host: ${pageContext.host || "the Company"}
- Page Content: ${pageContext.content || ""}

Return a clean, valid JSON object with the following keys. Do not include any markdown formatting, surrounding text, or explanation, just the raw JSON block:
{
  "company": "Company Name",
  "role": "Job Role / Title",
  "coverLetter": "Complete letter body text including contact header, subject, date, salutations, body paragraphs, and sign-off."
}`;

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
