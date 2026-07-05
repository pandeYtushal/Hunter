import { NotificationCenter } from "./NotificationCenter";

export interface ConcurrentTask {
  id: string;
  goal: string;
  priority: "low" | "medium" | "high";
  progress: number;
  status: "pending" | "running" | "paused" | "completed" | "failed" | "cancelled";
  logs: string[];
  memory: Record<string, any>;
  steps: any[];
  errors: string[];
}

export class ConcurrentScheduler {
  static async getTasks(): Promise<ConcurrentTask[]> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return [];
    const data = await chrome.storage.local.get("concurrentTasks");
    return data?.concurrentTasks || [];
  }

  static async saveTasks(tasks: ConcurrentTask[]): Promise<void> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    await chrome.storage.local.set({ concurrentTasks: tasks });
    
    // Set extension action badge counts
    const active = tasks.filter(t => t.status === "running").length;
    if (active > 0) {
      await NotificationCenter.setBadge(String(active));
    } else {
      await NotificationCenter.clearBadge();
    }
  }

  static async addTask(goal: string, priority: "low" | "medium" | "high" = "medium"): Promise<string> {
    const tasks = await this.getTasks();
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    const newTask: ConcurrentTask = {
      id,
      goal,
      priority,
      progress: 0,
      status: "pending",
      logs: [`Task scheduled with ${priority} priority.`],
      memory: {},
      steps: [],
      errors: []
    };

    tasks.push(newTask);
    await this.saveTasks(tasks);
    await NotificationCenter.sendToast("Task Added", `Scheduled: "${goal.slice(0, 40)}..."`);
    
    void this.dispatchNext();
    return id;
  }

  static async pauseTask(id: string): Promise<void> {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task && task.status === "running") {
      task.status = "paused";
      task.logs.push("Task execution paused by user.");
      await this.saveTasks(tasks);
      await NotificationCenter.sendToast("Task Paused", `Paused: "${task.goal.slice(0, 30)}..."`);
      void this.dispatchNext();
    }
  }

  static async resumeTask(id: string): Promise<void> {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task && task.status === "paused") {
      task.status = "pending";
      task.logs.push("Task execution resumed.");
      await this.saveTasks(tasks);
      await NotificationCenter.sendToast("Task Resumed", `Resumed: "${task.goal.slice(0, 30)}..."`);
      void this.dispatchNext();
    }
  }

  static async cancelTask(id: string): Promise<void> {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task && (task.status === "running" || task.status === "paused" || task.status === "pending")) {
      task.status = "cancelled";
      task.logs.push("Task cancelled by user.");
      await this.saveTasks(tasks);
      await NotificationCenter.sendToast("Task Cancelled", `Cancelled: "${task.goal.slice(0, 30)}..."`);
      void this.dispatchNext();
    }
  }

  static async retryTask(id: string): Promise<void> {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task && (task.status === "failed" || task.status === "cancelled")) {
      task.status = "pending";
      task.progress = 0;
      task.logs = ["Task retried by user."];
      task.steps = [];
      task.errors = [];
      await this.saveTasks(tasks);
      await NotificationCenter.sendToast("Task Retrying", `Retrying: "${task.goal.slice(0, 30)}..."`);
      void this.dispatchNext();
    }
  }

  static async logToTask(id: string, logEntry: string, progress?: number): Promise<void> {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.logs.push(logEntry);
      if (progress !== undefined) {
        task.progress = progress;
      }
      await this.saveTasks(tasks);
    }
  }

  static async completeTask(id: string, result?: string): Promise<void> {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.status = "completed";
      task.progress = 100;
      task.logs.push("Task completed successfully.");
      if (result) {
        task.memory.result = result;
      }
      await this.saveTasks(tasks);
      await NotificationCenter.sendToast("Task Complete", `Finished: "${task.goal.slice(0, 30)}..."`);
      void this.dispatchNext();
    }
  }

  static async failTask(id: string, error: string): Promise<void> {
    const tasks = await this.getTasks();
    const task = tasks.find(t => t.id === id);
    if (task) {
      task.status = "failed";
      task.logs.push(`Task failed: ${error}`);
      task.errors.push(error);
      await this.saveTasks(tasks);
      await NotificationCenter.sendToast("Task Failed", `Error: "${task.goal.slice(0, 30)}..."`);
      void this.dispatchNext();
    }
  }

  static async dispatchNext(): Promise<void> {
    const tasks = await this.getTasks();
    const runningCount = tasks.filter(t => t.status === "running").length;
    const maxConcurrency = 2;

    if (runningCount >= maxConcurrency) return;

    const priorityOrder = { high: 3, medium: 2, low: 1 };
    const pendingTasks = tasks
      .filter(t => t.status === "pending")
      .sort((a, b) => priorityOrder[b.priority] - priorityOrder[a.priority]);

    const nextTask = pendingTasks[0];
    if (nextTask) {
      nextTask.status = "running";
      nextTask.logs.push("Task execution started.");
      await this.saveTasks(tasks);
      
      void this.executeTask(nextTask.id, nextTask.goal);
    }
  }

  private static async executeTask(id: string, goal: string): Promise<void> {
    const { PipelineOrchestrator } = await import("../automation/PipelineOrchestrator");
    try {
      // Periodic check for pause/cancellation hooks inside execution loop
      const finalState = await PipelineOrchestrator.run(goal, (stepProgress) => {
        if (stepProgress.currentStep) {
          void this.logToTask(id, stepProgress.currentStep, stepProgress.progress);
        }
      }, id);

      // Query current state to check if user cancelled midway
      const tasks = await this.getTasks();
      const currentTask = tasks.find(t => t.id === id);
      if (currentTask && currentTask.status === "cancelled") {
        return;
      }

      if (finalState.errors && finalState.errors.length > 0) {
        await this.failTask(id, finalState.errors.join("; "));
      } else {
        await this.completeTask(id, finalState.finalResult);
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Unexpected concurrent orchestrator error.";
      await this.failTask(id, errMsg);
    }
  }
}
