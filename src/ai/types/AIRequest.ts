import type { ChatMessage } from "../../shared/types/messages";

export interface AIRequest {
  prompt: string;
  systemInstruction?: string;
  history?: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  jsonMode?: boolean;
}
