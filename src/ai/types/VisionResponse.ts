import type { VisualElement } from "../../vision/VisionTypes";

export interface VisionResponse {
  text: string;
  reasoning?: string;
  elements?: VisualElement[];
  confidence?: number;
  tokensUsed?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  costEstimate?: number;
  latencyMs?: number;
  model: string;
  provider: string;
}
