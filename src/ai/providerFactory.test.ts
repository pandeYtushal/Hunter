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
    const gKey = await Encryption.encrypt("g-key");
    const oKey = await Encryption.encrypt("o-key");
    const aKey = await Encryption.encrypt("a-key");
    const grKey = await Encryption.encrypt("gr-key");
    const orKey = await Encryption.encrypt("or-key");
    const dsKey = await Encryption.encrypt("ds-key");

    vi.mocked(storage.get).mockImplementation(async (key) => {
      if (key === "apiKeys") {
        return {
          apiKey: gKey,
          openaiApiKey: oKey,
          anthropicApiKey: aKey,
          groqApiKey: grKey,
          openrouterApiKey: orKey,
          deepseekApiKey: dsKey
        };
      }
      if (key === "settings") {
        return {
          ollamaUrl: "http://localhost:11434",
          model: "test-model"
        };
      }
      return {};
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
