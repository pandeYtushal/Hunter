export interface ModelPricing {
  inputCostPer1M: number;
  outputCostPer1M: number;
}

export const AI_CONFIG = {
  models: {
    gemini: (import.meta.env?.VITE_GEMINI_MODEL as string) || "gemini-3.5-flash",
    openai: (import.meta.env?.VITE_OPENAI_MODEL as string) || "gpt-4o-mini",
    anthropic: (import.meta.env?.VITE_ANTHROPIC_MODEL as string) || "claude-3-5-sonnet-20241022",
    groq: (import.meta.env?.VITE_GROQ_MODEL as string) || "llama-3.3-70b-versatile",
    openrouter: "google/gemini-2.5-flash",
    deepseek: "deepseek-chat",
    ollama: "llama3"
  },
  pricing: {
    // Default pricing profiles per 1 Million tokens
    "gemini-3.5-flash": { inputCostPer1M: 0.075, outputCostPer1M: 0.30 },
    "gpt-4o-mini": { inputCostPer1M: 0.15, outputCostPer1M: 0.60 },
    "claude-3-5-sonnet-20241022": { inputCostPer1M: 3.00, outputCostPer1M: 15.00 },
    "llama-3.3-70b-versatile": { inputCostPer1M: 0.59, outputCostPer1M: 0.79 },
    "deepseek-chat": { inputCostPer1M: 0.14, outputCostPer1M: 0.28 },
    "default": { inputCostPer1M: 0.15, outputCostPer1M: 0.60 }
  } as Record<string, ModelPricing>,
  
  estimateCost(model: string, inputTokens: number, outputTokens: number): number {
    // Match pricing configuration
    let pricing = this.pricing[model];
    if (!pricing) {
      // Try fuzzy matching
      const key = Object.keys(this.pricing).find(k => model.includes(k));
      pricing = key ? this.pricing[key] : this.pricing.default;
    }
    
    // Calculate cost
    const inputCost = (inputTokens / 1_000_000) * pricing.inputCostPer1M;
    const outputCost = (outputTokens / 1_000_000) * pricing.outputCostPer1M;
    return inputCost + outputCost;
  }
};
