import type { AIProvider } from "./AIProvider";
import type { AIRequest } from "../types/AIRequest";
import type { AIResponse } from "../types/AIResponse";
import type { VisionRequest } from "../types/VisionRequest";
import type { VisionResponse } from "../types/VisionResponse";
import type { EmbeddingRequest } from "../types/EmbeddingRequest";
import type { ProviderCapabilities } from "../types/ProviderCapabilities";
import { CapabilityRegistry } from "../core/CapabilityRegistry";
import { AI_CONFIG } from "../core/AIConfig";
import { ProviderHealth } from "../core/ProviderHealth";

export class DeepSeekProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || AI_CONFIG.models.deepseek;
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      throw new Error("DeepSeek API key is not configured.");
    }
  }

  private mapMessages(request: AIRequest) {
    const messages: any[] = [];
    if (request.systemInstruction) {
      messages.push({ role: "system", content: request.systemInstruction });
    }
    if (request.history) {
      messages.push(
        ...request.history.slice(-15).map((msg) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content
        }))
      );
    }
    messages.push({ role: "user", content: request.prompt });
    return messages;
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const endpoint = "https://api.deepseek.com/chat/completions";
    const messages = this.mapMessages(request);

    const body: any = {
      model: this.model,
      messages,
      temperature: request.temperature ?? 0.6,
      max_tokens: request.maxTokens ?? 1024
    };

    if (request.jsonMode) {
      body.response_format = { type: "json_object" };
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error?.message || `DeepSeek HTTP error ${response.status}`);
      }

      const text = data.choices?.[0]?.message?.content || "";
      const latency = Date.now() - startTime;

      const promptTokens = data.usage?.prompt_tokens || Math.round((request.prompt.length + (request.systemInstruction?.length || 0)) / 4);
      const completionTokens = data.usage?.completion_tokens || Math.round(text.length / 4);
      const totalTokens = promptTokens + completionTokens;
      const cost = AI_CONFIG.estimateCost(this.model, promptTokens, completionTokens);

      ProviderHealth.recordSuccess("deepseek", latency, totalTokens, cost);

      return {
        text,
        tokensUsed: { promptTokens, completionTokens, totalTokens },
        costEstimate: cost,
        latencyMs: latency,
        model: this.model,
        provider: "deepseek"
      };
    } catch (error) {
      ProviderHealth.recordFailure("deepseek");
      throw error;
    }
  }

  async vision(request: VisionRequest): Promise<VisionResponse> {
    throw new Error("DeepSeek provider does not support vision capability.");
  }

  async embeddings(request: EmbeddingRequest): Promise<number[]> {
    console.warn("DeepSeek provider does not support embeddings capability.");
    return [];
  }

  async streamChat(request: AIRequest, onChunk: (chunk: string) => void): Promise<AIResponse> {
    const startTime = Date.now();
    const endpoint = "https://api.deepseek.com/chat/completions";
    const messages = this.mapMessages(request);

    const body: any = {
      model: this.model,
      messages,
      temperature: request.temperature ?? 0.6,
      max_tokens: request.maxTokens ?? 1024,
      stream: true
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `DeepSeek Streaming HTTP error ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullText = "";
      let buffer = "";

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.startsWith("data:")) {
              const payload = cleanLine.substring(5).trim();
              if (payload === "[DONE]") continue;
              try {
                const dataJson = JSON.parse(payload);
                const chunkText = dataJson.choices?.[0]?.delta?.content || "";
                if (chunkText) {
                  fullText += chunkText;
                  onChunk(chunkText);
                }
              } catch (e) {
                // Ignore chunk parse errors
              }
            }
          }
        }
      }

      const latency = Date.now() - startTime;
      const promptTokens = Math.round((request.prompt.length + (request.systemInstruction?.length || 0)) / 4);
      const completionTokens = Math.round(fullText.length / 4);
      const totalTokens = promptTokens + completionTokens;
      const cost = AI_CONFIG.estimateCost(this.model, promptTokens, completionTokens);

      ProviderHealth.recordSuccess("deepseek", latency, totalTokens, cost);

      return {
        text: fullText,
        tokensUsed: { promptTokens, completionTokens, totalTokens },
        costEstimate: cost,
        latencyMs: latency,
        model: this.model,
        provider: "deepseek"
      };
    } catch (error) {
      ProviderHealth.recordFailure("deepseek");
      throw error;
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.chat({ prompt: "ping", maxTokens: 1 });
      return true;
    } catch {
      return false;
    }
  }

  supportsCapability(capability: keyof ProviderCapabilities): boolean {
    return CapabilityRegistry.supports("deepseek", capability);
  }

  async shutdown(): Promise<void> {
    // No-op
  }
}
