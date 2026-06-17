import { describe, expect, it } from "vitest";
import { TaskScheduler, type CopilotTask } from "./TaskScheduler";
import { WorkflowPlanner } from "./WorkflowPlanner";
import { RecoveryEngine } from "./RecoveryEngine";

describe("WorkflowPlanner", () => {
  it("generates correct tasks for apply_job goal", () => {
    const plan = { goal: "apply_job" as const, agents: ["JobAgent"] as any[], actions: [] as any[] };
    const tasks = WorkflowPlanner.plan(plan);
    expect(tasks.length).toBe(8);
    expect(tasks[0].action).toBe("extract_job");
    expect(tasks[1].action).toBe("research_company");
  });

  it("generates sequential tasks for custom execution plans", () => {
    const plan = { goal: "chat_fallback" as const, agents: [] as any[], actions: ["navigate_page", "extract_text"] as any[] };
    const tasks = WorkflowPlanner.plan(plan);
    expect(tasks.length).toBe(2);
    expect(tasks[0].action).toBe("navigate_page");
    expect(tasks[1].action).toBe("extract_text");
  });
});

describe("TaskScheduler", () => {
  it("handles basic lifecycle states of tasks", () => {
    const task: CopilotTask = {
      id: "1",
      name: "Test Task",
      action: "extract_job",
      status: "pending",
      attempts: 0
    };
    const scheduler = new TaskScheduler([task]);
    expect(scheduler.hasNext()).toBe(true);
    expect(scheduler.getCurrentTask()).toEqual(task);

    scheduler.completeTask("1");
    expect(scheduler.hasNext()).toBe(false);
    expect(task.status).toBe("completed");
  });

  it("allows dynamic task injection", () => {
    const task1: CopilotTask = { id: "1", name: "Task 1", action: "extract_job", status: "pending", attempts: 0 };
    const task2: CopilotTask = { id: "2", name: "Task 2", action: "save_job", status: "pending", attempts: 0 };
    
    const scheduler = new TaskScheduler([task1]);
    scheduler.injectTask(task2);

    const tasks = scheduler.getTasks();
    expect(tasks.length).toBe(2);
    expect(tasks[1].id).toBe("2");
  });

  it("handles retry actions correctly resetting indexes", () => {
    const task1: CopilotTask = { id: "1", name: "Task 1", action: "extract_job", status: "pending", attempts: 0 };
    const task2: CopilotTask = { id: "2", name: "Task 2", action: "save_job", status: "pending", attempts: 0 };

    const scheduler = new TaskScheduler([task1, task2]);
    scheduler.completeTask("1");
    expect(scheduler.getCurrentTask()?.id).toBe("2");

    scheduler.retryTask("1");
    expect(scheduler.getCurrentTask()?.id).toBe("1");
    expect(task1.status).toBe("pending");
  });
});

describe("RecoveryEngine", () => {
  it("recovers element click action into a visual click override", async () => {
    const failedTask: CopilotTask = {
      id: "1",
      name: "Click",
      action: "click_element",
      status: "failed",
      attempts: 1
    };
    const result = await RecoveryEngine.determineRecovery(failedTask, "Selector not found", 123);
    expect(result).not.toBeNull();
    expect(result?.action).toBe("vision_click");
  });
});
