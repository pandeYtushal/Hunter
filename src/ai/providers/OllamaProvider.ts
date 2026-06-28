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

export class OllamaProvider implements AIProvider {
  private url: string;
  private model: string;

  constructor(url: string, model?: string) {
    this.url = (url || "http://localhost:11434").replace(/\/$/, "");
    this.model = model || AI_CONFIG.models.ollama;
  }

  async initialize(): Promise<void> {
    // No initialization check needed for offline Ollama
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
    const endpoint = `${this.url}/api/chat`;
    const messages = this.mapMessages(request);

    const body: any = {
      model: this.model,
      messages,
      options: {
        temperature: request.temperature ?? 0.6,
        num_predict: request.maxTokens ?? 4096
      },
      stream: false
    };

    if (request.jsonMode) {
      body.format = "json";
    }

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Ollama HTTP error ${response.status}`);
      }

      const text = data.message?.content || "";
      const latency = Date.now() - startTime;

      const promptTokens = data.prompt_eval_count || Math.round((request.prompt.length + (request.systemInstruction?.length || 0)) / 4);
      const completionTokens = data.eval_count || Math.round(text.length / 4);
      const totalTokens = promptTokens + completionTokens;
      
      // Ollama runs locally so cost is 0
      ProviderHealth.recordSuccess("ollama", latency, totalTokens, 0);

      return {
        text,
        tokensUsed: { promptTokens, completionTokens, totalTokens },
        costEstimate: 0,
        latencyMs: latency,
        model: this.model,
        provider: "ollama"
      };
    } catch (error) {
      ProviderHealth.recordFailure("ollama");
      throw error;
    }
  }

  async vision(request: VisionRequest): Promise<VisionResponse> {
    const startTime = Date.now();
    const endpoint = `${this.url}/api/chat`;

    const body = {
      model: this.model,
      messages: [
        {
          role: "user",
          content: request.prompt,
          images: [request.imageBufferOrBase64]
        }
      ],
      options: {
        temperature: 0.1
      },
      format: "json",
      stream: false
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || `Ollama Vision HTTP error ${response.status}`);
      }

      const text = data.message?.content || "";
      const latency = Date.now() - startTime;

      const promptTokens = data.prompt_eval_count || 800;
      const completionTokens = data.eval_count || Math.round(text.length / 4);
      const totalTokens = promptTokens + completionTokens;

      ProviderHealth.recordSuccess("ollama", latency, totalTokens, 0);

      const parsedResult = VisionParser.parse(text);

      return {
        text,
        reasoning: parsedResult.reasoning,
        elements: parsedResult.elements,
        confidence: parsedResult.confidence,
        latencyMs: latency,
        costEstimate: 0,
        model: this.model,
        provider: "ollama"
      };
    } catch (error) {
      ProviderHealth.recordFailure("ollama");
      throw error;
    }
  }

  async embeddings(request: EmbeddingRequest): Promise<number[]> {
    const endpoint = `${this.url}/api/embeddings`;
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: this.model,
          prompt: request.text
        })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ollama embedding error");
      }
      return data.embedding || [];
    } catch (error) {
      console.error("Ollama Embeddings error:", error);
      return [];
    }
  }

  async streamChat(request: AIRequest, onChunk: (chunk: string) => void): Promise<AIResponse> {
    const startTime = Date.now();
    const endpoint = `${this.url}/api/chat`;
    const messages = this.mapMessages(request);

    const body: any = {
      model: this.model,
      messages,
      options: {
        temperature: request.temperature ?? 0.6,
        num_predict: request.maxTokens ?? 4096
      },
      stream: true
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Ollama Streaming HTTP error ${response.status}`);
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
            if (cleanLine) {
              try {
                const dataJson = JSON.parse(cleanLine);
                const chunkText = dataJson.message?.content || "";
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

      ProviderHealth.recordSuccess("ollama", latency, totalTokens, 0);

      return {
        text: fullText,
        tokensUsed: { promptTokens, completionTokens, totalTokens },
        costEstimate: 0,
        latencyMs: latency,
        model: this.model,
        provider: "ollama"
      };
    } catch (error) {
      ProviderHealth.recordFailure("ollama");
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
    return CapabilityRegistry.supports("ollama", capability);
  }

  async shutdown(): Promise<void> {
    // No-op
  }
}
