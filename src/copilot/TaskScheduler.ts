import type { ActionType } from "../shared/types/agent";

export interface CopilotTask {
  id: string;
  name: string;
  action: ActionType;
  status: "pending" | "running" | "completed" | "failed" | "skipped" | "waiting_confirmation";
  attempts: number;
  error?: string;
  description?: string;
}

export class TaskScheduler {
  private tasks: CopilotTask[] = [];
  private currentIndex = 0;

  constructor(tasks: CopilotTask[] = []) {
    this.tasks = tasks;
  }

  getTasks(): CopilotTask[] {
    return this.tasks;
  }

  getCurrentTask(): CopilotTask | null {
    if (this.currentIndex >= this.tasks.length) return null;
    return this.tasks[this.currentIndex];
  }

  injectTask(task: CopilotTask, offset = 1): void {
    // Inserts a task dynamically after the current index
    const targetIdx = this.currentIndex + offset;
    this.tasks.splice(targetIdx, 0, task);
  }

  skipTask(id: string): void {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.tasks[idx].status = "skipped";
      if (idx === this.currentIndex) {
        this.currentIndex++;
      }
    }
  }

  retryTask(id: string): void {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.tasks[idx].status = "pending";
      this.tasks[idx].attempts = 0;
      this.tasks[idx].error = undefined;
      if (idx < this.currentIndex) {
        this.currentIndex = idx;
      }
    }
  }

  completeTask(id: string): void {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.tasks[idx].status = "completed";
      if (idx === this.currentIndex) {
        this.currentIndex++;
      }
    }
  }

  failTask(id: string, error: string): void {
    const idx = this.tasks.findIndex((t) => t.id === id);
    if (idx !== -1) {
      this.tasks[idx].status = "failed";
      this.tasks[idx].error = error;
      if (idx === this.currentIndex) {
        this.currentIndex++;
      }
    }
  }

  hasNext(): boolean {
    return this.currentIndex < this.tasks.length;
  }

  reset(): void {
    this.currentIndex = 0;
    this.tasks.forEach((t) => {
      t.status = "pending";
      t.attempts = 0;
      t.error = undefined;
    });
  }
}
