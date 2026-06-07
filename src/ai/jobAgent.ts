import { generateAiReply } from "./aiService";
import type { PageSnapshot } from "../shared/types/messages";
import { robustJsonParse } from "../shared/json";

export interface ExtractedJob {
  title: string;
  company: string;
  location: string;
  salary: string;
  experience: string;
  skills: string[];
}

export const extractJobDetails = async (pageContext: PageSnapshot): Promise<ExtractedJob> => {
  const prompt = `You are a structured data extraction agent. Extract the job details from the current page content and metadata.
Return a clean, valid JSON object with the following keys. Do not include any markdown formatting, surrounding text, or explanation, just the raw JSON block:
{
  "title": "Job Title (or 'Unknown')",
  "company": "Company Name (or 'Unknown')",
  "location": "Location (or 'Unknown')",
  "salary": "Salary or Compensation info (or 'Unknown')",
  "experience": "Required experience level or years (or 'Unknown')",
  "skills": ["Skill 1", "Skill 2", ...] (an array of required skills or technologies)
}`;

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
