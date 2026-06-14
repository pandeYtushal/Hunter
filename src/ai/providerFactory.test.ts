import { describe, expect, it, vi } from "vitest";
import { ProviderFactory } from "./core/ProviderFactory";
import { GeminiProvider } from "./providers/GeminiProvider";
import { OpenAIProvider } from "./providers/OpenAIProvider";
import { ClaudeProvider } from "./providers/ClaudeProvider";
import { GroqProvider } from "./providers/GroqProvider";
import { OpenRouterProvider } from "./providers/OpenRouterProvider";
import { DeepSeekProvider } from "./providers/DeepSeekProvider";
import { OllamaProvider } from "./providers/OllamaProvider";
import { storage } from "../shared/storage";
import { Encryption } from "../shared/encryption";

vi.mock("../shared/storage", () => ({
  storage: {
    get: vi.fn()
  }
}));

describe("ProviderFactory Instantiation", () => {
  it("creates the correct provider instances based on configuration", async () => {
    vi.mocked(storage.get).mockResolvedValue({
      apiKey: Encryption.encrypt("g-key"),
      openaiApiKey: Encryption.encrypt("o-key"),
      anthropicApiKey: Encryption.encrypt("a-key"),
      groqApiKey: Encryption.encrypt("gr-key"),
      openrouterApiKey: Encryption.encrypt("or-key"),
      deepseekApiKey: Encryption.encrypt("ds-key"),
      ollamaUrl: "http://localhost:11434",
      model: "test-model"
    });

    const gemini = await ProviderFactory.createProvider("gemini");
    expect(gemini).toBeInstanceOf(GeminiProvider);

    const openai = await ProviderFactory.createProvider("openai");
    expect(openai).toBeInstanceOf(OpenAIProvider);

    const anthropic = await ProviderFactory.createProvider("anthropic");
    expect(anthropic).toBeInstanceOf(ClaudeProvider);

    const groq = await ProviderFactory.createProvider("groq");
    expect(groq).toBeInstanceOf(GroqProvider);

    const openrouter = await ProviderFactory.createProvider("openrouter");
    expect(openrouter).toBeInstanceOf(OpenRouterProvider);

    const deepseek = await ProviderFactory.createProvider("deepseek");
    expect(deepseek).toBeInstanceOf(DeepSeekProvider);

    const ollama = await ProviderFactory.createProvider("ollama");
    expect(ollama).toBeInstanceOf(OllamaProvider);
  });
});
