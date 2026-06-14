import { storage } from "../../shared/storage";
import type { AIRequest } from "../types/AIRequest";
import type { AIResponse } from "../types/AIResponse";
import type { VisionRequest } from "../types/VisionRequest";
import type { VisionResponse } from "../types/VisionResponse";
import type { EmbeddingRequest } from "../types/EmbeddingRequest";
import type { ProviderCapabilities } from "../types/ProviderCapabilities";
import { ProviderFactory } from "./ProviderFactory";
import { CapabilityRegistry } from "./CapabilityRegistry";
import { ProviderHealth } from "./ProviderHealth";
import { Encryption } from "../../shared/encryption";

export class AIManager {
  private static instance: AIManager;

  private constructor() {}

  public static getInstance(): AIManager {
    if (!AIManager.instance) {
      AIManager.instance = new AIManager();
    }
    return AIManager.instance;
  }

  /**
   * Helper to check if a provider has configured API key
   */
  private async isProviderConfigured(provider: string, settings: any): Promise<boolean> {
    if (!settings) return false;
    const pName = provider.toLowerCase();
    switch (pName) {
      case "openai":
        return Boolean(settings.openaiApiKey?.trim());
      case "anthropic":
        return Boolean(settings.anthropicApiKey?.trim());
      case "groq":
        return Boolean(settings.groqApiKey?.trim());
      case "openrouter":
        return Boolean(settings.openrouterApiKey?.trim());
      case "deepseek":
        return Boolean(settings.deepseekApiKey?.trim());
      case "ollama":
        return true; // Ollama is local, doesn't mandate keys
      case "gemini":
      default:
        return Boolean(settings.apiKey?.trim());
    }
  }

  /**
   * Resolve healthy, capability-matched provider
   */
  private async resolveProvider(
    capability: keyof ProviderCapabilities,
    preferredProvider: string,
    fallbackProvider?: string
  ): Promise<string> {
    const settings = await storage.get("settings").catch(() => null);
    const primary = preferredProvider.toLowerCase();
    
    // 1. Check if preferred provider is configured & supports the capability
    const primaryConfigured = await this.isProviderConfigured(primary, settings);
    const primarySupports = CapabilityRegistry.supports(primary, capability);
    
    if (primaryConfigured && primarySupports) {
      return primary;
    }

    // 2. Try the configured fallback provider
    if (fallbackProvider && fallbackProvider !== "none") {
      const fb = fallbackProvider.toLowerCase();
      const fbConfigured = await this.isProviderConfigured(fb, settings);
      const fbSupports = CapabilityRegistry.supports(fb, capability);
      if (fbConfigured && fbSupports) {
        ProviderHealth.recordFallback(primary, fb, `Primary provider ${primary} lacked ${capability} capability or credentials.`);
        return fb;
      }
    }

    // 3. Search CapabilityRegistry for any configured alternative supporting capability
    const providers = ["gemini", "openai", "anthropic", "groq", "openrouter", "deepseek", "ollama"];
    for (const prov of providers) {
      if (prov === primary) continue;
      const isConfigured = await this.isProviderConfigured(prov, settings);
      const supports = CapabilityRegistry.supports(prov, capability);
      if (isConfigured && supports) {
        ProviderHealth.recordFallback(primary, prov, `Automatic fallback: selected healthy ${prov} for ${capability}.`);
        return prov;
      }
    }

    // Default fallback to gemini as final hope
    return "gemini";
  }

  /**
   * General execution wrapper with retry and fallbacks
   */
  private async executeWithFallback<T>(
    capability: keyof ProviderCapabilities,
    preferredProvider: string,
    executeFn: (providerName: string) => Promise<T>
  ): Promise<T> {
    const settings = await storage.get("settings").catch(() => null);
    const fallbackProvider = settings?.fallbackProvider || "none";
    
    // Resolve primary target
    let activeProvider = await this.resolveProvider(capability, preferredProvider, fallbackProvider);
    
    try {
      // Primary attempt
      return await executeFn(activeProvider);
    } catch (err: any) {
      console.warn(`Primary execution failed on ${activeProvider}: ${err.message}. Retrying...`);
      ProviderHealth.recordFailure(activeProvider, err.message?.includes("rate limit") || err.status === 429);
      
      try {
        // Retry once
        await new Promise(resolve => setTimeout(resolve, 200));
        return await executeFn(activeProvider);
      } catch (retryErr: any) {
        console.warn(`Retry failed on ${activeProvider}. Executing fallback routing...`);
        ProviderHealth.recordFailure(activeProvider);

        // Fallback provider attempt
        if (fallbackProvider && fallbackProvider !== "none" && fallbackProvider.toLowerCase() !== activeProvider) {
          const fb = fallbackProvider.toLowerCase();
          const supports = CapabilityRegistry.supports(fb, capability);
          const isConfigured = await this.isProviderConfigured(fb, settings);
          
          if (supports && isConfigured) {
            try {
              ProviderHealth.recordFallback(activeProvider, fb, retryErr.message || "Primary provider retry failed");
              return await executeFn(fb);
            } catch (fbErr: any) {
              console.error(`Fallback provider ${fb} failed: ${fbErr.message}`);
              ProviderHealth.recordFailure(fb);
            }
          }
        }

        // Alternative provider attempt
        const alternatives = ["gemini", "openai", "anthropic", "groq", "openrouter", "deepseek", "ollama"]
          .filter(p => p !== activeProvider && p !== fallbackProvider.toLowerCase());
          
        for (const alt of alternatives) {
          const supports = CapabilityRegistry.supports(alt, capability);
          const isConfigured = await this.isProviderConfigured(alt, settings);
          if (supports && isConfigured) {
            try {
              ProviderHealth.recordFallback(activeProvider, alt, "Fallback cascading to alternative");
              return await executeFn(alt);
            } catch (altErr: any) {
              console.error(`Alternative provider ${alt} failed: ${altErr.message}`);
              ProviderHealth.recordFailure(alt);
            }
          }
        }

        throw new Error(`All configured AI providers failed. Last error: ${retryErr.message}`);
      }
    }
  }

  /**
   * Execute Chat
   */
  async chat(request: AIRequest): Promise<AIResponse> {
    const settings = await storage.get("settings").catch(() => null);
    const preferred = settings?.provider || "gemini";
    
    return await this.executeWithFallback("chat", preferred, async (prov) => {
      const provider = await ProviderFactory.createProvider(prov);
      await provider.initialize();
      return await provider.chat(request);
    });
  }

  /**
   * Execute Vision
   */
  async vision(request: VisionRequest): Promise<VisionResponse> {
    const settings = await storage.get("settings").catch(() => null);
    // Use configured vision provider or fall back to main provider selection
    const preferred = settings?.visionProvider || settings?.provider || "gemini";
    
    return await this.executeWithFallback("vision", preferred, async (prov) => {
      const provider = await ProviderFactory.createProvider(prov);
      await provider.initialize();
      return await provider.vision(request);
    });
  }

  /**
   * Execute Embeddings
   */
  async embeddings(request: EmbeddingRequest): Promise<number[]> {
    const settings = await storage.get("settings").catch(() => null);
    const preferred = settings?.embeddingProvider || settings?.provider || "gemini";
    
    return await this.executeWithFallback("embeddings", preferred, async (prov) => {
      const provider = await ProviderFactory.createProvider(prov);
      await provider.initialize();
      return await provider.embeddings(request);
    });
  }

  /**
   * Execute StreamChat
   */
  async streamChat(request: AIRequest, onChunk: (chunk: string) => void): Promise<AIResponse> {
    const settings = await storage.get("settings").catch(() => null);
    const preferred = settings?.provider || "gemini";

    return await this.executeWithFallback("streaming", preferred, async (prov) => {
      const provider = await ProviderFactory.createProvider(prov);
      await provider.initialize();
      return await provider.streamChat(request, onChunk);
    });
  }
}
