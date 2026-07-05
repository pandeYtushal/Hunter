import { describe, expect, it } from "vitest";
import { PromptManager } from "../../ai/core/PromptManager";

describe("Workspace Mode Prompt Integration", () => {
  it("includes general prompts by default", () => {
    const system = PromptManager.getSystemInstruction(undefined, undefined, "general");
    expect(system).toContain("You are HUNTERR, a concise assistant for browser workspace workflows.");
  });

  it("appends shopping instructions when shopping mode is selected", () => {
    const system = PromptManager.getSystemInstruction(undefined, undefined, "shopping");
    expect(system).toContain("SHOPPING ASSISTANT MODE ACTIVE");
    expect(system).toContain("price comparisons");
  });

  it("appends travel instructions when travel mode is selected", () => {
    const system = PromptManager.getSystemInstruction(undefined, undefined, "travel");
    expect(system).toContain("TRAVEL ASSISTANT MODE ACTIVE");
    expect(system).toContain("flight/hotel comparisons");
  });

  it("appends research instructions when research mode is selected", () => {
    const system = PromptManager.getSystemInstruction(undefined, undefined, "research");
    expect(system).toContain("RESEARCH ASSISTANT MODE ACTIVE");
    expect(system).toContain("deep analysis of company stats");
  });
});
