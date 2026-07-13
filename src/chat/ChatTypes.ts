import type { PageSnapshot } from "../shared/types/messages";
import type { UserProfile } from "../shared/types/storage";

export type MessageRole =
  | "user"
  | "assistant"
  | "system"
  | "tool"
  | "agent"
  | "vision"
  | "thinking"
  | "progress"
  | "error";

export interface ChatAttachment {
  id: string;
  name: string;
  type: "image" | "screenshot";
  mimeType: string;
  base64Data: string;
  size?: number;
  detectedElements?: any[];
  confidence?: number;
  suggestedActions?: string[];
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  createdAt: string;
  attachments?: ChatAttachment[];
  metadata?: {
    model?: string;
    provider?: string;
    tokensUsed?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    latencyMs?: number;
    detectedElements?: any[];
    confidence?: number;
    suggestedActions?: string[];
  };
}

export interface ChatConversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
  pinned?: boolean;
}

export interface ChatContextInfo {
  currentUrl: string;
  pageSnapshot: PageSnapshot | null;
  selectedText: string;
  screenshotBase64: string | null;
  longTermMemory: any | null;
  currentGoal: string | null;
  currentAgent: string | null;
  profile: UserProfile | null;
}

export interface DeveloperMetrics {
  selectedProvider: string;
  visionProvider: string;
  contextSize: number;
  prompt: string;
  streamingStatus: "idle" | "streaming" | "completed" | "error";
  tokenUsage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}
