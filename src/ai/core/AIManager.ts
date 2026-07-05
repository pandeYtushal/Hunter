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
import type { AgentSettings, ApiKeys } from "../../shared/types/storage";
import { LoggerService } from "../../core/services/LoggerService";
import { AnalyticsService } from "../../core/services/AnalyticsService";

export class AIManager {
  private static instance: AIManager;
  private cumulativeSessionTokens = 0;

  private constructor() {}

  public static getInstance(): AIManager {
    if (!AIManager.instance) {
      AIManager.instance = new AIManager();
    }
    return AIManager.instance;
  }

  public resetSessionTokens(): void {
    this.cumulativeSessionTokens = 0;
  }

  public getSessionTokens(): number {
    return this.cumulativeSessionTokens;
  }

  /**
   * Helper to check if a provider has configured API key
   */
  private async isProviderConfigured(provider: string, apiKeys: ApiKeys | null | undefined): Promise<boolean> {
    if (!apiKeys) return false;
    const pName = provider.toLowerCase();
    const hasKey = async (value?: string) => {
      const decrypted = await Encryption.decrypt(value || "");
      return Boolean(decrypted.trim());
    };

    switch (pName) {
      case "openai":
        return await hasKey(apiKeys.openaiApiKey);
      case "anthropic":
        return await hasKey(apiKeys.anthropicApiKey);
      case "groq":
        return await hasKey(apiKeys.groqApiKey);
      case "openrouter":
        return await hasKey(apiKeys.openrouterApiKey);
      case "deepseek":
        return await hasKey(apiKeys.deepseekApiKey);
      case "ollama":
        return true; // Ollama is local, doesn't mandate keys
      case "gemini":
      default:
        return await hasKey(apiKeys.apiKey);
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
    const [settings, apiKeys] = await Promise.all([
      storage.get("settings").catch(() => null),
      storage.get("apiKeys").catch(() => null)
    ]);
    const primary = preferredProvider.toLowerCase();
    
    // 1. Check if preferred provider is configured & supports the capability
    const primaryConfigured = await this.isProviderConfigured(primary, apiKeys);
    const primarySupports = CapabilityRegistry.supports(primary, capability);
    
    if (primaryConfigured && primarySupports) {
      return primary;
    }

    // 2. Try the configured fallback provider
    if (fallbackProvider && fallbackProvider !== "none") {
      const fb = fallbackProvider.toLowerCase();
      const fbConfigured = await this.isProviderConfigured(fb, apiKeys);
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
      const isConfigured = await this.isProviderConfigured(prov, apiKeys);
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
    const [settings, apiKeys] = await Promise.all([
      storage.get("settings").catch(() => null),
      storage.get("apiKeys").catch(() => null)
    ]);
    const fallbackProvider = settings?.fallbackProvider || "none";
    const limit = settings?.maxSessionTokens || 50000;
    if (this.cumulativeSessionTokens > limit) {
      throw new Error(`Session token budget exceeded (${this.cumulativeSessionTokens.toLocaleString()} / ${limit.toLocaleString()} tokens). Aborting execution to prevent quota exhaustion.`);
    }
    
    // Resolve primary target
    let activeProvider = await this.resolveProvider(capability, preferredProvider, fallbackProvider);
    
    const startTime = performance.now();
    const trackTokens = (res: any) => {
      const durationMs = Math.round(performance.now() - startTime);
      let totalTokens = 0;
      if (res && typeof res === "object" && "tokensUsed" in res) {
        const total = res.tokensUsed?.totalTokens;
        if (typeof total === "number") {
          this.cumulativeSessionTokens += total;
          totalTokens = total;
        }
      }
      AnalyticsService.trackEvent("AI_REQUEST_SUCCESS", durationMs, {
        provider: activeProvider,
        capability,
        tokensUsed: totalTokens
      });
      return res;
    };

    const isRateLimit = (err: any): boolean => {
      const errMsg = String(err.message || "").toLowerCase();
      return (
        errMsg.includes("rate limit") ||
        errMsg.includes("429") ||
        err.status === 429 ||
        err.statusCode === 429
      );
    };

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    try {
      // Primary attempt
      const result = await executeFn(activeProvider);
      return trackTokens(result);
    } catch (err: any) {
      LoggerService.warn(`Primary execution failed on ${activeProvider}: ${err.message}. Retrying...`);
      const rateLimited = isRateLimit(err);
      ProviderHealth.recordFailure(activeProvider, rateLimited);
      
      try {
        // Retry once with exponential backoff if rate limited, or default 200ms delay
        let delay = 200;
        if (rateLimited) {
          const jitter = Math.random() * 300;
          delay = Math.min(500 + jitter, 3000);
          LoggerService.warn(`Encountered rate limit on ${activeProvider}. Backing off for ${Math.round(delay)}ms before retry...`);
        }
        await sleep(delay);
        const result = await executeFn(activeProvider);
        return trackTokens(result);
      } catch (retryErr: any) {
        LoggerService.warn(`Retry failed on ${activeProvider}. Executing fallback routing...`);
        ProviderHealth.recordFailure(activeProvider, isRateLimit(retryErr));
        AnalyticsService.trackEvent("AI_REQUEST_RETRY_FAILED", Math.round(performance.now() - startTime), {
          provider: activeProvider,
          capability,
          error: retryErr.message
        });

        // Fallback provider attempt
        if (fallbackProvider && fallbackProvider !== "none" && fallbackProvider.toLowerCase() !== activeProvider) {
          const fb = fallbackProvider.toLowerCase();
          const supports = CapabilityRegistry.supports(fb, capability);
          const isConfigured = await this.isProviderConfigured(fb, apiKeys);
          
          if (supports && isConfigured) {
            try {
              ProviderHealth.recordFallback(activeProvider, fb, retryErr.message || "Primary provider retry failed");
              const result = await executeFn(fb);
              return trackTokens(result);
            } catch (fbErr: any) {
              LoggerService.error(`Fallback provider ${fb} failed`, fbErr);
              ProviderHealth.recordFailure(fb);
            }
          }
        }

        // Alternative provider attempt
        const alternatives = ["gemini", "openai", "anthropic", "groq", "openrouter", "deepseek", "ollama"]
          .filter(p => p !== activeProvider && p !== fallbackProvider.toLowerCase());
          
        for (const alt of alternatives) {
          const supports = CapabilityRegistry.supports(alt, capability);
          const isConfigured = await this.isProviderConfigured(alt, apiKeys);
          if (supports && isConfigured) {
            try {
              ProviderHealth.recordFallback(activeProvider, alt, "Fallback cascading to alternative");
              const result = await executeFn(alt);
              return trackTokens(result);
            } catch (altErr: any) {
              LoggerService.error(`Alternative provider ${alt} failed`, altErr);
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
