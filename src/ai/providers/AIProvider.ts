import type { AIRequest } from "../types/AIRequest";
import type { AIResponse } from "../types/AIResponse";
import type { VisionRequest } from "../types/VisionRequest";
import type { VisionResponse } from "../types/VisionResponse";
import type { EmbeddingRequest } from "../types/EmbeddingRequest";
import type { ProviderCapabilities } from "../types/ProviderCapabilities";

export interface AIProvider {
  initialize(): Promise<void>;
  chat(request: AIRequest): Promise<AIResponse>;
  vision(request: VisionRequest): Promise<VisionResponse>;
  embeddings(request: EmbeddingRequest): Promise<number[]>;
  streamChat(request: AIRequest, onChunk: (chunk: string) => void): Promise<AIResponse>;
  healthCheck(): Promise<boolean>;
  supportsCapability(capability: keyof ProviderCapabilities): boolean;
  shutdown(): Promise<void>;
}
