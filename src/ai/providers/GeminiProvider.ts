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

export class GeminiProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || AI_CONFIG.models.gemini;
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      throw new Error("Gemini API key is not configured.");
    }
  }

  private mapHistory(history: AIRequest["history"]) {
    if (!history) return [];
    return history.slice(-15).map((msg) => ({
      role: msg.role === "assistant" ? "model" : "user",
      parts: [{ text: msg.content }]
    }));
  }

  async chat(request: AIRequest): Promise<AIResponse> {
    const startTime = Date.now();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;
    
    const contents = [
      ...this.mapHistory(request.history),
      { role: "user", parts: [{ text: request.prompt }] }
    ];

    const body: any = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.6,
        maxOutputTokens: request.maxTokens ?? 4096
      }
    };

    if (request.systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: request.systemInstruction }]
      };
    }

    if (request.jsonMode) {
      body.generationConfig.responseMimeType = "application/json";
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error?.message || `Gemini HTTP error ${response.status}`);
      }

      const text = data.candidates?.[0]?.content?.parts?.map((p: any) => p.text).join("\n") || "";
      const latency = Date.now() - startTime;
      
      // Roughly estimate tokens if not returned (Gemini returns usageMetadata sometimes)
      const promptTokens = data.usageMetadata?.promptTokenCount || Math.round((request.prompt.length + (request.systemInstruction?.length || 0)) / 4);
      const completionTokens = data.usageMetadata?.candidatesTokenCount || Math.round(text.length / 4);
      const totalTokens = promptTokens + completionTokens;
      
      const cost = AI_CONFIG.estimateCost(this.model, promptTokens, completionTokens);
      
      ProviderHealth.recordSuccess("gemini", latency, totalTokens, cost);

      return {
        text,
        tokensUsed: { promptTokens, completionTokens, totalTokens },
        costEstimate: cost,
        latencyMs: latency,
        model: this.model,
        provider: "gemini"
      };
    } catch (error) {
      ProviderHealth.recordFailure("gemini");
      throw error;
    }
  }

  async vision(request: VisionRequest): Promise<VisionResponse> {
    const startTime = Date.now();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    try {
      const parts: any[] = [
        { text: request.prompt },
        {
          inlineData: {
            mimeType: request.mimeType || "image/jpeg",
            data: request.imageBufferOrBase64
          }
        }
      ];

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json"
          }
        })
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error?.message || `Gemini Vision error ${response.status}`);
      }

      const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
      const latency = Date.now() - startTime;
      
      const promptTokens = data.usageMetadata?.promptTokenCount || 500; // viewports are heavy
      const completionTokens = data.usageMetadata?.candidatesTokenCount || Math.round(text.length / 4);
      const totalTokens = promptTokens + completionTokens;
      const cost = AI_CONFIG.estimateCost(this.model, promptTokens, completionTokens);
      
      ProviderHealth.recordSuccess("gemini", latency, totalTokens, cost);

      const parsedResult = VisionParser.parse(text);

      return {
        text,
        reasoning: parsedResult.reasoning,
        elements: parsedResult.elements,
        confidence: parsedResult.confidence,
        latencyMs: latency,
        costEstimate: cost,
        model: this.model,
        provider: "gemini"
      };
    } catch (error) {
      ProviderHealth.recordFailure("gemini");
      throw error;
    }
  }

  async embeddings(request: EmbeddingRequest): Promise<number[]> {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${this.apiKey}`;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/text-embedding-004",
          content: { parts: [{ text: request.text }] }
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Gemini embedding error");
      }
      return data.embedding?.values || [];
    } catch (error) {
      console.error("Gemini Embeddings error:", error);
      return [];
    }
  }

  async streamChat(request: AIRequest, onChunk: (chunk: string) => void): Promise<AIResponse> {
    const startTime = Date.now();
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`;

    const contents = [
      ...this.mapHistory(request.history),
      { role: "user", parts: [{ text: request.prompt }] }
    ];

    const body: any = {
      contents,
      generationConfig: {
        temperature: request.temperature ?? 0.6,
        maxOutputTokens: request.maxTokens ?? 4096
      }
    };

    if (request.systemInstruction) {
      body.systemInstruction = {
        parts: [{ text: request.systemInstruction }]
      };
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `Gemini Streaming HTTP error ${response.status}`);
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
              try {
                const dataJson = JSON.parse(cleanLine.substring(5).trim());
                const chunkText = dataJson.candidates?.[0]?.content?.parts?.[0]?.text || "";
                if (chunkText) {
                  fullText += chunkText;
                  onChunk(chunkText);
                }
              } catch (e) {
                // Ignore chunk parsing errors
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

      ProviderHealth.recordSuccess("gemini", latency, totalTokens, cost);

      return {
        text: fullText,
        tokensUsed: { promptTokens, completionTokens, totalTokens },
        costEstimate: cost,
        latencyMs: latency,
        model: this.model,
        provider: "gemini"
      };
    } catch (error) {
      ProviderHealth.recordFailure("gemini");
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
    return CapabilityRegistry.supports("gemini", capability);
  }

  async shutdown(): Promise<void> {
    // No-op
  }
}
