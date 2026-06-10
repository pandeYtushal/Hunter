import { describe, expect, it, vi } from "vitest";

// Mock Replanner
const mockReplan = vi.fn();
vi.mock("./replanner", () => ({
  Replanner: {
    replan: (...args: any[]) => mockReplan(...args)
  }
}));

import { SelfHealing } from "./selfHealing";
import type { ExecutionPlan } from "../types";

describe("SelfHealing", () => {
  it("determines correct fallback actions from predefined mapping", () => {
    const fillFormFallbacks = SelfHealing.getFallbackActions("fill_form");
    expect(fillFormFallbacks).toEqual(["click_element", "fill_input", "extract_text"]);

    const chatFallbacks = SelfHealing.getFallbackActions("chat_fallback");
    expect(chatFallbacks).toEqual([]);
  });

  it("handles Tier 1: simple retry on attempt 1", async () => {
    const currentPlan: ExecutionPlan = {
      goal: "apply_job",
      agents: ["JobAgent"],
      actions: ["extract_job"]
    };

    const result = await SelfHealing.heal(
      "apply to job",
      currentPlan,
      "extract_job",
      "Network connection interrupted",
      1,
      []
    );

    expect(result.strategy).toBe("retry");
    expect(result.explanation).toContain("Retrying action");
    expect(result.newActions).toBeUndefined();
  });

  it("handles Tier 2: alternative action fallback on attempt 2", async () => {
    const currentPlan: ExecutionPlan = {
      goal: "apply_job",
      agents: ["JobAgent"],
      actions: ["extract_job", "save_job"]
    };

    const result = await SelfHealing.heal(
      "apply to job",
      currentPlan,
      "extract_job",
      "Parsing failed",
      2,
      []
    );

    expect(result.strategy).toBe("fallback");
    // "extract_job" has fallback actions: ["extract_text", "chat_fallback"]
    // First fallback is "extract_text"
    // Remaining original actions: ["save_job"]
    // New actions should be: ["extract_text", "save_job"]
    expect(result.newActions).toEqual(["extract_text", "save_job"]);
    expect(result.explanation).toContain("Substituting failed action");
  });

  it("handles Tier 3: falls back to full replanning on attempt >= 3 or when no fallbacks exist", async () => {
    mockReplan.mockResolvedValueOnce({
      newActions: ["chat_fallback"],
      explanation: "Replanned to fallback chat"
    });

    const currentPlan: ExecutionPlan = {
      goal: "apply_job",
      agents: ["JobAgent"],
      actions: ["extract_job"]
    };

    const result = await SelfHealing.heal(
      "apply to job",
      currentPlan,
      "extract_job",
      "Persistent parse error",
      3,
      []
    );

    expect(result.strategy).toBe("replan");
    expect(result.newActions).toEqual(["chat_fallback"]);
    expect(result.explanation).toBe("Replanned to fallback chat");
    expect(mockReplan).toHaveBeenCalledWith(
      "apply to job",
      currentPlan,
      "extract_job",
      "Persistent parse error",
      [],
      undefined
    );
  });
});
