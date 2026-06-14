export interface ProviderCapabilities {
  chat: boolean;
  vision: boolean;
  embeddings: boolean;
  streaming: boolean;
  functionCalling: boolean;
  jsonMode: boolean;
}
