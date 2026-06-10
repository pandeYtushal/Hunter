import { describe, expect, it } from "vitest";
import { GoalTracker } from "./goalTracker";

describe("GoalTracker", () => {
  it("initializes sub-goals and basic tracking state", () => {
    const goal = "apply for standard engineer role";
    const actions = ["extract_job", "match_resume", "fill_form"];

    const progress = GoalTracker.initialize(goal, actions);

    expect(progress.goal).toBe(goal);
    expect(progress.completionPercentage).toBe(0);
    expect(progress.isBlocked).toBe(false);
    expect(progress.subGoals).toHaveLength(3);
    
    // Description formatting check: underscore replaced with space
    expect(progress.subGoals[0]).toEqual({
      id: "extract_job",
      description: "extract job",
      status: "pending"
    });
  });

  it("updates progress status, percentage, and block state correctly", () => {
    const actions = ["extract_job", "match_resume", "fill_form"];
    let progress = GoalTracker.initialize("apply", actions);

    // Transition one action to running
    progress = GoalTracker.updateProgress(progress, "extract_job", "running");
    expect(progress.subGoals[0].status).toBe("running");
    expect(progress.completionPercentage).toBe(0);
    expect(progress.isBlocked).toBe(false);

    // Transition first action to completed (1 of 3 -> 33%)
    progress = GoalTracker.updateProgress(progress, "extract_job", "completed");
    expect(progress.subGoals[0].status).toBe("completed");
    expect(progress.completionPercentage).toBe(33);

    // Transition second action to completed (2 of 3 -> 67%)
    progress = GoalTracker.updateProgress(progress, "match_resume", "completed");
    expect(progress.subGoals[1].status).toBe("completed");
    expect(progress.completionPercentage).toBe(67);

    // Mark third action as blocked
    progress = GoalTracker.updateProgress(progress, "fill_form", "failed", true, "Form structure invalid");
    expect(progress.subGoals[2].status).toBe("failed");
    expect(progress.isBlocked).toBe(true);
    expect(progress.blockReason).toBe("Form structure invalid");
    expect(progress.completionPercentage).toBe(67);
  });
});
