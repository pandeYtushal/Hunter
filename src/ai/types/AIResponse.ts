export interface AIResponse {
  text: string;
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
