import type { ChatMessage, PageSnapshot } from "../shared/types/messages";
import type { UserProfile } from "../shared/types/storage";
import { AIManager } from "./core/AIManager";
import { PromptManager } from "./core/PromptManager";
import { storage } from "../shared/storage";

export interface GenerateAiReplyInput {
  prompt: string;
  history: ChatMessage[];
  pageContext?: PageSnapshot;
  profile?: UserProfile;
}

export const generateAiReply = async ({
  prompt,
  history,
  pageContext,
  profile
}: GenerateAiReplyInput): Promise<string> => {
  const settings = await storage.get("settings").catch(() => null);
  const systemInstruction = PromptManager.getSystemInstruction(pageContext, profile);

  const response = await AIManager.getInstance().chat({
    prompt,
    systemInstruction,
    history,
    temperature: settings?.temperature,
    maxTokens: settings?.maxTokens
  });

  return response.text;
};

// Backwards-compatibility alias
export const generateGeminiReply = generateAiReply;
