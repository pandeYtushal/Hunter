import { generateAiReply } from "./aiService";
import { robustJsonParse } from "../shared/json";
import { PromptManager } from "./core/PromptManager";

export interface FormAgentMapping {
  fieldId: string;
  mappedType: "name" | "firstName" | "lastName" | "email" | "phone" | "linkedin" | "portfolio" | "resume" | "unknown";
}

export const analyzeFormFields = async (
  formHtmlExcerpt: string
): Promise<FormAgentMapping[]> => {
  const prompt = PromptManager.getFormFieldsAnalysisPrompt(formHtmlExcerpt);

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
