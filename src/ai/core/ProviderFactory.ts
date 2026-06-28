import { storage } from "../../shared/storage";
import { Encryption } from "../../shared/encryption";
import type { AIProvider } from "../providers/AIProvider";
import { GeminiProvider } from "../providers/GeminiProvider";
import { OpenAIProvider } from "../providers/OpenAIProvider";
import { ClaudeProvider } from "../providers/ClaudeProvider";
import { GroqProvider } from "../providers/GroqProvider";
import { OpenRouterProvider } from "../providers/OpenRouterProvider";
import { DeepSeekProvider } from "../providers/DeepSeekProvider";
import { OllamaProvider } from "../providers/OllamaProvider";

export class ProviderFactory {
  static async createProvider(providerName: string, customModel?: string): Promise<AIProvider> {
    const [settings, apiKeys] = await Promise.all([
      storage.get("settings").catch(() => null),
      storage.get("apiKeys").catch(() => null)
    ]);
    const pName = providerName.toLowerCase();

    switch (pName) {
      case "openai": {
        const rawKey = apiKeys?.openaiApiKey || "";
        const key = await Encryption.decrypt(rawKey);
        return new OpenAIProvider(key, customModel || settings?.model);
      }
      case "anthropic": {
        const rawKey = apiKeys?.anthropicApiKey || "";
        const key = await Encryption.decrypt(rawKey);
        return new ClaudeProvider(key, customModel || settings?.model);
      }
      case "groq": {
        const rawKey = apiKeys?.groqApiKey || "";
        const key = await Encryption.decrypt(rawKey);
        return new GroqProvider(key, customModel || settings?.model);
      }
      case "openrouter": {
        const rawKey = apiKeys?.openrouterApiKey || "";
        const key = await Encryption.decrypt(rawKey);
        return new OpenRouterProvider(key, customModel || settings?.model);
      }
      case "deepseek": {
        const rawKey = apiKeys?.deepseekApiKey || "";
        const key = await Encryption.decrypt(rawKey);
        return new DeepSeekProvider(key, customModel || settings?.model);
      }
      case "ollama": {
        const url = settings?.ollamaUrl || "";
        return new OllamaProvider(url, customModel || settings?.model);
      }
      case "gemini":
      default: {
        const rawKey = apiKeys?.apiKey || "";
        const key = await Encryption.decrypt(rawKey);
        return new GeminiProvider(key, customModel || settings?.model);
      }
    }
  }
}
