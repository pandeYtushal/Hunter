import { describe, expect, it, vi } from "vitest";

vi.mock("./aiService", () => ({
  generateAiReply: vi.fn(async () => JSON.stringify({
    goal: "save_job",
    agents: ["JobAgent"],
    actions: ["extract_job", "save_job"]
  }))
}));

import { planUserGoal } from "./planner";

describe("Planner", () => {
  it("classifies before generating a constrained plan", async () => {
    const plan = await planUserGoal("track this job posting");
    expect(plan.intent?.intent).toBe("SAVE_JOB");
    expect(plan.actions).toEqual(["extract_job", "save_job"]);
  });

  it("does not call the LLM for chat fallback", async () => {
    const plan = await planUserGoal("thanks");
    expect(plan.goal).toBe("chat_fallback");
  });
});
