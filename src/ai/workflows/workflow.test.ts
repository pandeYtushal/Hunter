import { describe, expect, it, vi, beforeEach } from "vitest";
import { WorkflowEngine, type Workflow, type WorkflowStep } from "./WorkflowEngine";

// Mock global chrome storage
const storageStore: Record<string, any> = {};
global.chrome = {
  storage: {
    local: {
      get: vi.fn().mockImplementation(async (keys) => {
        if (typeof keys === "string") {
          return { [keys]: storageStore[keys] };
        }
        const result: Record<string, any> = {};
        for (const k of keys) {
          result[k] = storageStore[k];
        }
        return result;
      }),
      set: vi.fn().mockImplementation(async (obj) => {
        for (const [k, v] of Object.entries(obj)) {
          storageStore[k] = v;
        }
      }),
      remove: vi.fn().mockImplementation(async (key) => {
        if (typeof key === "string") {
          delete storageStore[key];
        } else {
          for (const k of key) {
            delete storageStore[k];
          }
        }
      })
    }
  }
} as any;

// Mock PipelineOrchestrator to avoid triggering real agent runs
vi.mock("../automation/PipelineOrchestrator", () => ({
  PipelineOrchestrator: {
    run: vi.fn().mockResolvedValue({ finalResult: "Success Result", errors: [] })
  }
}));

describe("WorkflowEngine Runner", () => {
  beforeEach(() => {
    storageStore.workflowHistory = [];
  });

  it("substitutes double curly bracket variables correctly", () => {
    const text = "Hi {{name}}, apply for {{job}} position";
    const vars = { name: "Tushal", job: "Software Engineer" };
    // Access private static method for testing
    const result = (WorkflowEngine as any).substituteVars(text, vars);
    expect(result).toBe("Hi Tushal, apply for Software Engineer position");
  });

  it("creates a workflow execution history log on run", async () => {
    const workflow: Workflow = {
      id: "wf-1",
      name: "Test Flow",
      steps: [
        { id: "s1", type: "wait", params: { duration: 10 } }
      ],
      variables: { testKey: "testVal" }
    };

    const runId = await WorkflowEngine.run(workflow);
    expect(runId).toBeDefined();

    // Verify it is logged in chrome storage
    const history = await WorkflowEngine.getHistory();
    expect(history.length).toBeGreaterThan(0);
    expect(history[0].workflowId).toBe("wf-1");
  });
});
