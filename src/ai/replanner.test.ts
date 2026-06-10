import { describe, expect, it, vi } from "vitest";

// Mock generateAiReply
const mockGenerateAiReply = vi.fn();
vi.mock("./aiService", () => ({
  generateAiReply: (args: any) => mockGenerateAiReply(args)
}));

import { Replanner } from "./replanner";
import type { ExecutionPlan } from "../types";

describe("Replanner", () => {
  it("successfully returns revised actions and explanation from valid LLM JSON", async () => {
    mockGenerateAiReply.mockResolvedValueOnce(
      JSON.stringify({
        newActions: ["extract_text", "chat_fallback"],
        explanation: "Since fill_form failed, we fallback to extracting text and chat."
      })
    );

    const currentPlan: ExecutionPlan = {
      goal: "autofill_form",
      agents: ["FormAgent"],
      actions: ["fill_form"]
    };

    const result = await Replanner.replan(
      "autofill form on the page",
      currentPlan,
      "fill_form",
      "Field mapping failed",
      []
    );

    expect(result.newActions).toEqual(["extract_text", "chat_fallback"]);
    expect(result.explanation).toBe("Since fill_form failed, we fallback to extracting text and chat.");
    expect(mockGenerateAiReply).toHaveBeenCalled();
  });

  it("handles empty or invalid newActions structure by falling back to currentPlan actions", async () => {
    mockGenerateAiReply.mockResolvedValueOnce(
      JSON.stringify({
        newActions: "invalid_not_array",
        explanation: "Faulty reply structure"
      })
    );

    const currentPlan: ExecutionPlan = {
      goal: "research_company",
      agents: ["ResearchAgent"],
      actions: ["research_company"]
    };

    const result = await Replanner.replan(
      "research google",
      currentPlan,
      "research_company",
      "Network timeout",
      []
    );

    expect(result.newActions).toEqual(["research_company"]);
    expect(result.explanation).toBe("Faulty reply structure");
  });

  it("recovers and filters out the failed action if LLM execution fails", async () => {
    mockGenerateAiReply.mockRejectedValueOnce(new Error("LLM failure"));

    const currentPlan: ExecutionPlan = {
      goal: "apply_job",
      agents: ["JobAgent", "FormAgent"],
      actions: ["extract_job", "fill_form"]
    };

    const result = await Replanner.replan(
      "apply to this job",
      currentPlan,
      "extract_job",
      "Selector not found",
      []
    );

    // Failed action "extract_job" should be filtered out
    expect(result.newActions).toEqual(["fill_form"]);
    expect(result.explanation).toContain("Skipped failed action \"extract_job\"");
  });
});
