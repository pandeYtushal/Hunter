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
import { robustJsonParse } from "../../shared/json";
import { VisionParser } from "../../vision/VisionParser";

export class ClaudeProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || AI_CONFIG.models.anthropic;
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      throw new Error("Claude API key is not configured.");
    }
  }

  private mapMessages(history: AIRequest["history"], prompt: string) {
    const messages: any[] = [];
    if (history) {
      messages.push(
        ...history.slice(-15).map((msg) => ({
          role: msg.role === "assistant" ? "assistant" : "user",
          content: msg.content
        }))
      );
    }
    messages.push({ role: "user", content: prompt });
    return messages;
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const endpoint = "https://api.anthropic.com/v1/messages";
    const messages = this.mapMessages(request.history, request.prompt);

    const body: any = {
      model: this.model,
      messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.6
    };

    if (request.systemInstruction) {
      body.system = request.systemInstruction;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify(body)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error?.message || `Claude HTTP error ${response.status}`);
      }

      const text = data.content?.[0]?.text || "";
      const latency = Date.now() - startTime;
      
      const promptTokens = data.usage?.input_tokens || Math.round((request.prompt.length + (request.systemInstruction?.length || 0)) / 4);
      const completionTokens = data.usage?.output_tokens || Math.round(text.length / 4);
      const totalTokens = promptTokens + completionTokens;
      const cost = AI_CONFIG.estimateCost(this.model, promptTokens, completionTokens);

      ProviderHealth.recordSuccess("anthropic", latency, totalTokens, cost);

      return {
        text,
        tokensUsed: { promptTokens, completionTokens, totalTokens },
        costEstimate: cost,
        latencyMs: latency,
        model: this.model,
        provider: "anthropic"
      };
    } catch (error) {
      ProviderHealth.recordFailure("anthropic");
      throw error;
    }
  }

  async vision(request: VisionRequest): Promise<VisionResponse> {
    const startTime = Date.now();
    const endpoint = "https://api.anthropic.com/v1/messages";
    const mimeType = request.mimeType || "image/jpeg";

    const body = {
      model: this.model,
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mimeType,
                data: request.imageBufferOrBase64
              }
            },
            {
              type: "text",
              text: request.prompt
            }
          ]
        }
      ],
      temperature: 0.1
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify(body)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error?.message || `Claude Vision HTTP error ${response.status}`);
      }

      const text = data.content?.[0]?.text || "";
      const latency = Date.now() - startTime;
      
      const promptTokens = data.usage?.input_tokens || 1000;
      const completionTokens = data.usage?.output_tokens || Math.round(text.length / 4);
      const totalTokens = promptTokens + completionTokens;
      const cost = AI_CONFIG.estimateCost(this.model, promptTokens, completionTokens);

      ProviderHealth.recordSuccess("anthropic", latency, totalTokens, cost);

      const parsedResult = VisionParser.parse(text);

      return {
        text,
        reasoning: parsedResult.reasoning,
        elements: parsedResult.elements,
        confidence: parsedResult.confidence,
        latencyMs: latency,
        costEstimate: cost,
        model: this.model,
        provider: "anthropic"
      };
    } catch (error) {
      ProviderHealth.recordFailure("anthropic");
      throw error;
    }
  }

  async embeddings(request: EmbeddingRequest): Promise<number[]> {
    console.warn("Claude provider does not support embeddings capability.");
    return [];
  }

  async streamChat(request: AIRequest, onChunk: (chunk: string) => void): Promise<AIResponse> {
    const startTime = Date.now();
    const endpoint = "https://api.anthropic.com/v1/messages";
    const messages = this.mapMessages(request.history, request.prompt);

    const body: any = {
      model: this.model,
      messages,
      max_tokens: request.maxTokens ?? 4096,
      temperature: request.temperature ?? 0.6,
      stream: true
    };

    if (request.systemInstruction) {
      body.system = request.systemInstruction;
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": this.apiKey,
          "anthropic-version": "2023-06-01",
          "anthropic-dangerous-direct-browser-access": "true"
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Claude Streaming HTTP error ${response.status}`);
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

          let currentEvent = "";

          for (const line of lines) {
            const cleanLine = line.trim();
            if (cleanLine.startsWith("event:")) {
              currentEvent = cleanLine.substring(6).trim();
            } else if (cleanLine.startsWith("data:")) {
              const payload = cleanLine.substring(5).trim();
              if (currentEvent === "content_block_delta" || payload.includes("content_block_delta")) {
                try {
                  const dataJson = JSON.parse(payload);
                  const chunkText = dataJson.delta?.text || "";
                  if (chunkText) {
                    fullText += chunkText;
                    onChunk(chunkText);
                  }
                } catch (e) {
                  // Ignore JSON parse errors
                }
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

      ProviderHealth.recordSuccess("anthropic", latency, totalTokens, cost);

      return {
        text: fullText,
        tokensUsed: { promptTokens, completionTokens, totalTokens },
        costEstimate: cost,
        latencyMs: latency,
        model: this.model,
        provider: "anthropic"
      };
    } catch (error) {
      ProviderHealth.recordFailure("anthropic");
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
    return CapabilityRegistry.supports("anthropic", capability);
  }

  async shutdown(): Promise<void> {
    // No-op
  }
}
