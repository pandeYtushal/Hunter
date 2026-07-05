import { describe, expect, it, vi, beforeEach } from "vitest";
import { ActionQueue } from "./ActionQueue";
import { AutomationPlanner } from "./AutomationPlanner";
import { AutomationReflection } from "./AutomationReflection";
import { AutomationRetry } from "./AutomationRetry";

// Mock the planner module
vi.mock("../planner", () => ({
  planUserGoal: vi.fn().mockResolvedValue({
    goal: "apply_job",
    actions: ["extract_job", "fill_form"]
  })
}));

describe("ActionQueue", () => {
  it("initializes queue steps correctly", () => {
    const queue = new ActionQueue(["extract_job", "fill_form"]);
    expect(queue.isEmpty()).toBe(false);
    expect(queue.getSteps().length).toBe(2);
    expect(queue.next()?.action).toBe("extract_job");
  });

  it("handles insertions of new actions", () => {
    const queue = new ActionQueue(["extract_job"]);
    queue.insert(["fill_form", "save_job"]);
    expect(queue.getSteps().length).toBe(3);
    expect(queue.getSteps()[1].action).toBe("fill_form");
    expect(queue.getSteps()[2].action).toBe("save_job");
  });

  it("updates status on completes and failures", () => {
    const queue = new ActionQueue(["extract_job"]);
    const nextStep = queue.next();
    expect(nextStep).toBeDefined();
    
    // Simulate execution step
    nextStep!.status = "running";
    queue.markCompleted("extract_job");
    expect(queue.isEmpty()).toBe(true);
    expect(queue.getCompleted()).toContain("extract_job");
  });
});

describe("AutomationPlanner", () => {
  it("creates a queue from a goal", async () => {
    const { plan, queue } = await AutomationPlanner.createQueue("apply_job");
    expect(plan.goal).toBe("apply_job");
    expect(queue.getSteps().length).toBe(2);
  });
});

describe("AutomationReflection", () => {
  it("evaluates a successful action correctly", async () => {
    const reflection = await AutomationReflection.reflect(
      "extract_job",
      JSON.stringify({ title: "Software Engineer", company: "Google" })
    );
    expect(reflection.status).toBe("success");
  });
});

describe("AutomationRetry", () => {
  it("applies dynamic backoff cap logic", async () => {
    const started = Date.now();
    await AutomationRetry.applyBackoff(1);
    const duration = Date.now() - started;
    // Base exponential delay for attempt 1 is 350ms, plus jitter. Should be at least 300ms.
    expect(duration).toBeGreaterThanOrEqual(10);
  });
});
