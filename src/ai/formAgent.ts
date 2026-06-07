import { generateAiReply } from "./aiService";
import { robustJsonParse } from "../shared/json";

export interface FormAgentMapping {
  fieldId: string;
  mappedType: "name" | "firstName" | "lastName" | "email" | "phone" | "linkedin" | "portfolio" | "resume" | "unknown";
}

export const analyzeFormFields = async (
  formHtmlExcerpt: string
): Promise<FormAgentMapping[]> => {
  const prompt = `You are a form analysis agent. Analyze the following HTML forms or serialized input fields from a job application.
Map each field to one of these standard profile fields:
- "name" (Full Name)
- "firstName" (First Name)
- "lastName" (Last Name)
- "email" (Email Address)
- "phone" (Phone Number)
- "linkedin" (LinkedIn Profile URL)
- "portfolio" (Portfolio or Personal Website URL)
- "resume" (Resume or CV File Upload input)
- "unknown" (Any other unrelated or general fields)

Form Inputs Data:
${formHtmlExcerpt}

Return a clean, valid JSON array of objects with the following keys. Do not include markdown code fences or comments, just the raw JSON:
[
  { "fieldId": "element-id-or-name", "mappedType": "email" },
  ...
]`;

  const responseText = await generateAiReply({
    prompt,
    history: []
  });

  try {
    return robustJsonParse<FormAgentMapping[]>(responseText);
  } catch (error) {
    console.error("Failed to parse FormAgent response as JSON:", responseText, error);
    return [];
  }
};
