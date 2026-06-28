import { describe, expect, it, vi, beforeEach } from "vitest";
import { AIManager } from "./core/AIManager";
import { ProviderHealth } from "./core/ProviderHealth";
import { CapabilityRegistry } from "./core/CapabilityRegistry";
import { ProviderFactory } from "./core/ProviderFactory";
import { Encryption } from "../shared/encryption";
import { storage } from "../shared/storage";

// Mock the shared storage module
vi.mock("../shared/storage", () => ({
  storage: {
    get: vi.fn(),
    set: vi.fn(),
    patch: vi.fn()
  }
}));

// Mock the ProviderFactory class
vi.mock("./core/ProviderFactory", () => ({
  ProviderFactory: {
    createProvider: vi.fn()
  }
}));

describe("Encryption and Key Obfuscation", () => {
  it("encrypts and decrypts string correctly", async () => {
    const plain = "test-api-key-12345";
    const encrypted = await Encryption.encrypt(plain);
    expect(encrypted).not.toBe(plain);
    expect(encrypted).not.toBe("");
    
    const decrypted = await Encryption.decrypt(encrypted);
    expect(decrypted).toBe(plain);
  });

  it("handles empty or falsy strings gracefully", async () => {
    expect(await Encryption.encrypt("")).toBe("");
    expect(await Encryption.decrypt("")).toBe("");
  });

  it("returns plain text back if decryption fails or string is not base64", async () => {
    const plainText = "just plain non-base64 text!!!";
    const decrypted = await Encryption.decrypt(plainText);
    expect(decrypted).toBe(plainText);
  });
});

describe("CapabilityRegistry", () => {
  it("correctly identifies capabilities for all providers", () => {
    expect(CapabilityRegistry.supports("gemini", "chat")).toBe(true);
    expect(CapabilityRegistry.supports("gemini", "vision")).toBe(true);
    expect(CapabilityRegistry.supports("gemini", "embeddings")).toBe(true);
    
    expect(CapabilityRegistry.supports("deepseek", "vision")).toBe(false);
    expect(CapabilityRegistry.supports("deepseek", "embeddings")).toBe(false);
    expect(CapabilityRegistry.supports("deepseek", "chat")).toBe(true);

    expect(CapabilityRegistry.supports("anthropic", "embeddings")).toBe(false);
    expect(CapabilityRegistry.supports("anthropic", "chat")).toBe(true);
  });

  it("returns undefined for unknown providers", () => {
    expect(CapabilityRegistry.getCapabilities("unknown-provider")).toBeUndefined();
    expect(CapabilityRegistry.supports("unknown-provider", "chat")).toBe(false);
  });
});

describe("ProviderHealth", () => {
  beforeEach(() => {
    ProviderHealth.clear();
  });

  it("records success stats correctly with rolling average latency", () => {
    // Record first success
    ProviderHealth.recordSuccess("gemini", 100, 50, 0.005);
    let stats = ProviderHealth.getStats("gemini");
    expect(stats.successCount).toBe(1);
    expect(stats.averageLatencyMs).toBe(100);
    expect(stats.totalTokens).toBe(50);
    expect(stats.totalCostEstimate).toBeCloseTo(0.005, 5);
    expect(stats.isAvailable).toBe(true);

    // Record second success
    ProviderHealth.recordSuccess("gemini", 200, 150, 0.015);
    stats = ProviderHealth.getStats("gemini");
    expect(stats.successCount).toBe(2);
    // rolling latency = (100 * 4 + 200) / 5 = 120
    expect(stats.averageLatencyMs).toBe(120);
    expect(stats.totalTokens).toBe(200);
    expect(stats.totalCostEstimate).toBeCloseTo(0.02, 5);
  });

  it("records failures and marks provider unavailable when threshold exceeded", () => {
    const stats = ProviderHealth.getStats("openai");
    expect(stats.isAvailable).toBe(true);

    // 1st failure
    ProviderHealth.recordFailure("openai");
    expect(ProviderHealth.getStats("openai").isAvailable).toBe(true);
    expect(ProviderHealth.getStats("openai").failureCount).toBe(1);

    // 2nd, 3rd, 4th failure
    ProviderHealth.recordFailure("openai");
    ProviderHealth.recordFailure("openai");
    ProviderHealth.recordFailure("openai");
    expect(ProviderHealth.getStats("openai").isAvailable).toBe(false);
    expect(ProviderHealth.getStats("openai").failureCount).toBe(4);
  });

  it("records fallback events correctly", () => {
    ProviderHealth.recordFallback("openai", "gemini", "Rate limit hit");
    const events = ProviderHealth.getFallbackEvents();
    expect(events.length).toBe(1);
    expect(events[0].fromProvider).toBe("openai");
    expect(events[0].toProvider).toBe("gemini");
    expect(events[0].reason).toBe("Rate limit hit");
  });

  it("retrieves all stats", () => {
    ProviderHealth.recordSuccess("gemini", 50, 10, 0.001);
    ProviderHealth.recordSuccess("openai", 120, 20, 0.002);
    const all = ProviderHealth.getAllStats();
    expect(all.length).toBe(2);
    expect(all.map(s => s.provider)).toContain("gemini");
    expect(all.map(s => s.provider)).toContain("openai");
  });

  it("increments rate limit hits when isRateLimit is true", () => {
    ProviderHealth.recordFailure("gemini", true);
    const stats = ProviderHealth.getStats("gemini");
    expect(stats.rateLimitHits).toBe(1);
    expect(stats.failureCount).toBe(1);
  });

  it("limits fallback events history to 50 items", () => {
    for (let i = 0; i < 55; i++) {
      ProviderHealth.recordFallback("openai", "gemini", `Reason ${i}`);
    }
    const events = ProviderHealth.getFallbackEvents();
    expect(events.length).toBe(50);
    expect(events[0].reason).toBe("Reason 5");
    expect(events[49].reason).toBe("Reason 54");
  });
});

describe("AIManager Routing and Fallbacks", () => {
  let mockProvider: any;

  beforeEach(() => {
    vi.clearAllMocks();
    ProviderHealth.clear();

    mockProvider = {
      initialize: vi.fn().mockResolvedValue(undefined),
      chat: vi.fn(),
      vision: vi.fn(),
      embeddings: vi.fn(),
      streamChat: vi.fn(),
      healthCheck: vi.fn().mockResolvedValue(true)
    };

    vi.mocked(ProviderFactory.createProvider).mockResolvedValue(mockProvider);
  });

  it("routes to primary provider on success", async () => {
    vi.mocked(storage.get).mockResolvedValue({
      provider: "openai",
      openaiApiKey: await Encryption.encrypt("key")
    });

    const expectedResponse = {
      text: "hello world",
      provider: "openai",
      model: "gpt-4o"
    };
    mockProvider.chat.mockResolvedValueOnce(expectedResponse);

    const result = await AIManager.getInstance().chat({ prompt: "hi" });
    
    expect(result).toEqual(expectedResponse);
    expect(ProviderFactory.createProvider).toHaveBeenCalledWith("openai");
    expect(mockProvider.chat).toHaveBeenCalledTimes(1);
  });

  it("retries primary provider on rate limit / initial failure", async () => {
    vi.mocked(storage.get).mockResolvedValue({
      provider: "gemini",
      apiKey: await Encryption.encrypt("gemini-key")
    });

    // Fail once, succeed on retry
    mockProvider.chat
      .mockRejectedValueOnce(new Error("Rate limit exceeded"))
      .mockResolvedValueOnce({ text: "success on retry" });

    const result = await AIManager.getInstance().chat({ prompt: "hi" });
    
    expect(result.text).toBe("success on retry");
    expect(mockProvider.chat).toHaveBeenCalledTimes(2);
  });

  it("falls back to configured fallback provider if primary retry fails", async () => {
    vi.mocked(storage.get).mockResolvedValue({
      provider: "gemini",
      apiKey: await Encryption.encrypt("gemini-key"),
      fallbackProvider: "openai",
      openaiApiKey: await Encryption.encrypt("openai-key")
    });

    // Gemini provider fails completely (primary and retry)
    mockProvider.chat.mockImplementation(async () => {
      throw new Error("Gemini down");
    });

    // Openai mock provider to be loaded
    const openaiProvider = {
      initialize: vi.fn().mockResolvedValue(undefined),
      chat: vi.fn().mockResolvedValue({ text: "Success via fallback" })
    };

    vi.mocked(ProviderFactory.createProvider).mockImplementation(async (prov) => {
      if (prov === "openai") return openaiProvider as any;
      return mockProvider;
    });

    const result = await AIManager.getInstance().chat({ prompt: "hi" });
    
    expect(result.text).toBe("Success via fallback");
    expect(openaiProvider.chat).toHaveBeenCalledTimes(1);
  });

  it("falls back dynamically to any other configured provider if both primary and fallback fail", async () => {
    vi.mocked(storage.get).mockResolvedValue({
      provider: "gemini",
      apiKey: await Encryption.encrypt("gemini-key"),
      fallbackProvider: "openai",
      openaiApiKey: await Encryption.encrypt("openai-key"),
      anthropicApiKey: await Encryption.encrypt("claude-key")
    });

    // Make createProvider return different provider mock interfaces
    const geminiMock = {
      initialize: vi.fn().mockResolvedValue(undefined),
      chat: vi.fn().mockRejectedValue(new Error("Gemini error"))
    };
    const openaiMock = {
      initialize: vi.fn().mockResolvedValue(undefined),
      chat: vi.fn().mockRejectedValue(new Error("Openai error"))
    };
    const anthropicMock = {
      initialize: vi.fn().mockResolvedValue(undefined),
      chat: vi.fn().mockResolvedValue({ text: "Success via Anthropic alternative cascade" })
    };

    vi.mocked(ProviderFactory.createProvider).mockImplementation(async (prov) => {
      if (prov === "gemini") return geminiMock as any;
      if (prov === "openai") return openaiMock as any;
      if (prov === "anthropic") return anthropicMock as any;
      return mockProvider;
    });

    const result = await AIManager.getInstance().chat({ prompt: "hi" });
    
    expect(result.text).toBe("Success via Anthropic alternative cascade");
    expect(anthropicMock.chat).toHaveBeenCalledTimes(1);
  });

  it("throws a cascading failure error when all configured providers fail", async () => {
    vi.mocked(storage.get).mockResolvedValue({
      provider: "gemini",
      apiKey: await Encryption.encrypt("gemini-key")
    });

    mockProvider.chat.mockRejectedValue(new Error("API issue"));

    await expect(AIManager.getInstance().chat({ prompt: "hi" })).rejects.toThrow("All configured AI providers failed");
  });

  it("supports vision calls and correctly routes to visionProvider if configured", async () => {
    vi.mocked(storage.get).mockResolvedValue({
      provider: "openai",
      openaiApiKey: await Encryption.encrypt("okey"),
      visionProvider: "gemini",
      apiKey: await Encryption.encrypt("gkey")
    });

    mockProvider.vision.mockResolvedValueOnce({
      text: "vision result",
      confidence: 0.95
    });

    const result = await AIManager.getInstance().vision({
      prompt: "describe",
      imageBufferOrBase64: "base64",
      mimeType: "image/jpeg"
    });

    expect(result.text).toBe("vision result");
    expect(ProviderFactory.createProvider).toHaveBeenCalledWith("gemini");
  });

  it("supports embedding calls and correctly routes to embeddingProvider", async () => {
    vi.mocked(storage.get).mockResolvedValue({
      provider: "openai",
      openaiApiKey: await Encryption.encrypt("okey"),
      embeddingProvider: "ollama",
      ollamaUrl: "http://localhost:11434"
    });

    mockProvider.embeddings.mockResolvedValueOnce([0.1, 0.2, 0.3]);

    const result = await AIManager.getInstance().embeddings({ text: "some text" });
    
    expect(result).toEqual([0.1, 0.2, 0.3]);
    expect(ProviderFactory.createProvider).toHaveBeenCalledWith("ollama");
  });

  it("supports streamChat routing", async () => {
    vi.mocked(storage.get).mockResolvedValue({
      provider: "gemini",
      apiKey: await Encryption.encrypt("gkey")
    });

    mockProvider.streamChat.mockImplementation(async (req: any, onChunk: any) => {
      onChunk("hello ");
      onChunk("world");
      return { text: "hello world" };
    });

    const onChunkCallback = vi.fn();
    const result = await AIManager.getInstance().streamChat({ prompt: "hi" }, onChunkCallback);

    expect(result.text).toBe("hello world");
    expect(onChunkCallback).toHaveBeenCalledWith("hello ");
    expect(onChunkCallback).toHaveBeenCalledWith("world");
    expect(onChunkCallback).toHaveBeenCalledTimes(2);
  });

  it("enforces session token budget limits and supports resetting", async () => {
    vi.mocked(storage.get).mockResolvedValue({
      provider: "gemini",
      apiKey: await Encryption.encrypt("gkey"),
      maxSessionTokens: 1000
    });

    // Reset tokens
    AIManager.getInstance().resetSessionTokens();
    expect(AIManager.getInstance().getSessionTokens()).toBe(0);

    // Mock response with tokens used
    mockProvider.chat.mockResolvedValue({
      text: "hello world",
      tokensUsed: { totalTokens: 600 }
    });

    // First call uses 600 tokens
    await AIManager.getInstance().chat({ prompt: "hi" });
    expect(AIManager.getInstance().getSessionTokens()).toBe(600);

    // Mock response with more tokens to push over limit
    mockProvider.chat.mockResolvedValue({
      text: "hello again",
      tokensUsed: { totalTokens: 500 }
    });

    // Second call uses 500 tokens, total is now 1100 (which exceeds maxSessionTokens: 1000)
    await AIManager.getInstance().chat({ prompt: "hi" });
    expect(AIManager.getInstance().getSessionTokens()).toBe(1100);

    // Third call should fail immediately without executing the provider because budget is exceeded
    await expect(AIManager.getInstance().chat({ prompt: "hi" })).rejects.toThrow("Session token budget exceeded");

    // Reset tokens and verify it succeeds again
    AIManager.getInstance().resetSessionTokens();
    expect(AIManager.getInstance().getSessionTokens()).toBe(0);

    mockProvider.chat.mockResolvedValueOnce({
      text: "recovered",
      tokensUsed: { totalTokens: 100 }
    });
    const result = await AIManager.getInstance().chat({ prompt: "hi" });
    expect(result.text).toBe("recovered");
    expect(AIManager.getInstance().getSessionTokens()).toBe(100);
  });
});
