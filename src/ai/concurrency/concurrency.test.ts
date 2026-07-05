import { describe, expect, it, vi, beforeEach } from "vitest";
import { SharedMemory } from "./SharedMemory";
import { ConcurrentScheduler } from "./ConcurrentScheduler";
import { SupervisorAgent } from "./SupervisorAgent";

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
        delete storageStore[key];
      })
    },
    onChanged: {
      addListener: vi.fn(),
      removeListener: vi.fn()
    }
  },
  tabs: {
    query: vi.fn().mockResolvedValue([{ id: 1 }]),
    sendMessage: vi.fn().mockResolvedValue({ ok: true })
  }
} as any;

// Mock LLM chat provider for splitting goals
vi.mock("../core/AIManager", () => ({
  AIManager: {
    getInstance: () => ({
      chat: vi.fn().mockResolvedValue({ text: `["Research company X", "Scan form layout"]` }),
      resetSessionTokens: vi.fn()
    })
  }
}));

describe("SharedMemory Service", () => {
  beforeEach(() => {
    storageStore.sharedMemory = {};
  });

  it("reads and writes key-value pairs correctly", async () => {
    await SharedMemory.set("job_title", "Software Engineer");
    const val = await SharedMemory.get("job_title");
    expect(val).toBe("Software Engineer");
  });

  it("clears memory correctly", async () => {
    await SharedMemory.set("temp_key", "value");
    await SharedMemory.clear();
    const val = await SharedMemory.get("temp_key");
    expect(val).toBeUndefined();
  });
});

describe("SupervisorAgent Goal Analyzer", () => {
  it("splits compound requests into multiple goal targets", async () => {
    const ids = await SupervisorAgent.analyzeAndSchedule("Research company X and apply for the engineer job");
    expect(ids.length).toBe(2);
  });
});

describe("ConcurrentScheduler Queue Manager", () => {
  beforeEach(() => {
    storageStore.concurrentTasks = [];
  });

  it("schedules tasks and updates status correctly", async () => {
    const id = await ConcurrentScheduler.addTask("Analyze layout", "high");
    const tasks = await ConcurrentScheduler.getTasks();
    expect(tasks.length).toBe(1);
    expect(tasks[0].id).toBe(id);
    expect(tasks[0].priority).toBe("high");
    expect(tasks[0].status).toBe("running");
  });

  it("supports pausing and resuming task nodes", async () => {
    const id = await ConcurrentScheduler.addTask("Read emails", "medium");
    // Simulate task running
    const tasks = await ConcurrentScheduler.getTasks();
    tasks[0].status = "running";
    await ConcurrentScheduler.saveTasks(tasks);

    await ConcurrentScheduler.pauseTask(id);
    const pausedTasks = await ConcurrentScheduler.getTasks();
    expect(pausedTasks[0].status).toBe("paused");

    await ConcurrentScheduler.resumeTask(id);
    const resumedTasks = await ConcurrentScheduler.getTasks();
    expect(resumedTasks[0].status).toBe("running");
  });

  it("supports cancelling and retrying task nodes", async () => {
    const id = await ConcurrentScheduler.addTask("Download pdf", "low");
    await ConcurrentScheduler.cancelTask(id);
    
    let tasks = await ConcurrentScheduler.getTasks();
    expect(tasks[0].status).toBe("cancelled");

    await ConcurrentScheduler.retryTask(id);
    tasks = await ConcurrentScheduler.getTasks();
    expect(tasks[0].status).toBe("running");
  });
});
