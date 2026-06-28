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

export class GroqProvider implements AIProvider {
  private apiKey: string;
  private model: string;

  constructor(apiKey: string, model?: string) {
    this.apiKey = apiKey;
    this.model = model || AI_CONFIG.models.groq;
  }

  async initialize(): Promise<void> {
    if (!this.apiKey) {
      throw new Error("Groq API key is not configured.");
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
    const endpoint = "https://api.groq.com/openai/v1/chat/completions";
    const messages = this.mapMessages(request);

    const body: any = {
      model: this.model,
      messages,
      temperature: request.temperature ?? 0.6,
      max_tokens: request.maxTokens ?? 4096
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
        throw new Error(data.error?.message || `Groq HTTP error ${response.status}`);
      }

      const text = data.choices?.[0]?.message?.content || "";
      const latency = Date.now() - startTime;
      
      const promptTokens = data.usage?.prompt_tokens || Math.round((request.prompt.length + (request.systemInstruction?.length || 0)) / 4);
      const completionTokens = data.usage?.completion_tokens || Math.round(text.length / 4);
      const totalTokens = promptTokens + completionTokens;
      const cost = AI_CONFIG.estimateCost(this.model, promptTokens, completionTokens);

      ProviderHealth.recordSuccess("groq", latency, totalTokens, cost);

      return {
        text,
        tokensUsed: { promptTokens, completionTokens, totalTokens },
        costEstimate: cost,
        latencyMs: latency,
        model: this.model,
        provider: "groq"
      };
    } catch (error) {
      ProviderHealth.recordFailure("groq");
      throw error;
    }
  }

  async vision(request: VisionRequest): Promise<VisionResponse> {
    const startTime = Date.now();
    // For Groq vision, map query to a compatible model if the default is LLama-70B non-vision.
    // Llama 3.2 11B Vision is a very standard model for Groq vision: llama-3.2-11b-vision-preview
    const visionModel = this.model.includes("vision") ? this.model : "llama-3.2-11b-vision-preview";
    const endpoint = "https://api.groq.com/openai/v1/chat/completions";
    const mimeType = request.mimeType || "image/jpeg";
    const imagePayload = `data:${mimeType};base64,${request.imageBufferOrBase64}`;

    const body = {
      model: visionModel,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: request.prompt },
            { type: "image_url", image_url: { url: imagePayload } }
          ]
        }
      ],
      temperature: 0.1,
      response_format: { type: "json_object" }
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

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error?.message || `Groq Vision HTTP error ${response.status}`);
      }

      const text = data.choices?.[0]?.message?.content || "";
      const latency = Date.now() - startTime;
      
      const promptTokens = data.usage?.prompt_tokens || 800;
      const completionTokens = data.usage?.completion_tokens || Math.round(text.length / 4);
      const totalTokens = promptTokens + completionTokens;
      const cost = AI_CONFIG.estimateCost(visionModel, promptTokens, completionTokens);

      ProviderHealth.recordSuccess("groq", latency, totalTokens, cost);

      const parsedResult = VisionParser.parse(text);

      return {
        text,
        reasoning: parsedResult.reasoning,
        elements: parsedResult.elements,
        confidence: parsedResult.confidence,
        latencyMs: latency,
        costEstimate: cost,
        model: visionModel,
        provider: "groq"
      };
    } catch (error) {
      ProviderHealth.recordFailure("groq");
      throw error;
    }
  }

  async embeddings(request: EmbeddingRequest): Promise<number[]> {
    const endpoint = "https://api.groq.com/openai/v1/embeddings";
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: request.model || "nomic-embed-text",
          input: request.text
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error?.message || "Groq embedding error");
      }
      return data.data?.[0]?.embedding || [];
    } catch (error) {
      console.error("Groq Embeddings error:", error);
      return [];
    }
  }

  async streamChat(request: AIRequest, onChunk: (chunk: string) => void): Promise<AIResponse> {
    const startTime = Date.now();
    const endpoint = "https://api.groq.com/openai/v1/chat/completions";
    const messages = this.mapMessages(request);

    const body: any = {
      model: this.model,
      messages,
      temperature: request.temperature ?? 0.6,
      max_tokens: request.maxTokens ?? 4096,
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
        throw new Error(errData.error?.message || `Groq Streaming HTTP error ${response.status}`);
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

      ProviderHealth.recordSuccess("groq", latency, totalTokens, cost);

      return {
        text: fullText,
        tokensUsed: { promptTokens, completionTokens, totalTokens },
        costEstimate: cost,
        latencyMs: latency,
        model: this.model,
        provider: "groq"
      };
    } catch (error) {
      ProviderHealth.recordFailure("groq");
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
    return CapabilityRegistry.supports("groq", capability);
  }

  async shutdown(): Promise<void> {
    // No-op
  }
}
