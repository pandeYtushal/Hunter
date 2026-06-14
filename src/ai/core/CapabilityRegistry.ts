import type { ProviderCapabilities } from "../types/ProviderCapabilities";

export const CAPABILITY_REGISTRY: Record<string, ProviderCapabilities> = {
  gemini: {
    chat: true,
    vision: true,
    embeddings: true,
    streaming: true,
    functionCalling: true,
    jsonMode: true
  },
  openai: {
    chat: true,
    vision: true,
    embeddings: true,
    streaming: true,
    functionCalling: true,
    jsonMode: true
  },
  anthropic: {
    chat: true,
    vision: true,
    embeddings: false,
    streaming: true,
    functionCalling: true,
    jsonMode: true
  },
  groq: {
    chat: true,
    vision: true,
    embeddings: true,
    streaming: true,
    functionCalling: true,
    jsonMode: true
  },
  openrouter: {
    chat: true,
    vision: true,
    embeddings: true,
    streaming: true,
    functionCalling: true,
    jsonMode: true
  },
  deepseek: {
    chat: true,
    vision: false,
    embeddings: false,
    streaming: true,
    functionCalling: true,
    jsonMode: true
  },
  ollama: {
    chat: true,
    vision: true,
    embeddings: true,
    streaming: true,
    functionCalling: true,
    jsonMode: true
  }
};

export const CapabilityRegistry = {
  supports(provider: string, capability: keyof ProviderCapabilities): boolean {
    const caps = CAPABILITY_REGISTRY[provider.toLowerCase()];
    return caps ? caps[capability] : false;
  },
  getCapabilities(provider: string): ProviderCapabilities | undefined {
    return CAPABILITY_REGISTRY[provider.toLowerCase()];
  }
};
