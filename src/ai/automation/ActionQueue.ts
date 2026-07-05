import type { ActionType, ExecutionStep } from "../../types/Action";

export class ActionQueue {
  private queue: ExecutionStep[] = [];
  private completed: ActionType[] = [];
  private failed: { action: ActionType; reason: string }[] = [];

  constructor(initialActions: ActionType[]) {
    this.queue = initialActions.map((action, index) => ({
      step: index + 1,
      action,
      description: action.replace(/_/g, " "),
      status: "pending",
      attempts: 0
    }));
  }

  getSteps(): ExecutionStep[] {
    return [...this.queue];
  }

  getCompleted(): ActionType[] {
    return [...this.completed];
  }

  getFailed(): { action: ActionType; reason: string }[] {
    return [...this.failed];
  }

  isEmpty(): boolean {
    return this.queue.every(s => s.status === "completed" || s.status === "failed");
  }

  next(): ExecutionStep | undefined {
    return this.queue.find(s => s.status === "pending" || s.status === "running");
  }

  insert(actions: ActionType[]) {
    const activeIndex = this.queue.findIndex(s => s.status === "pending" || s.status === "running");
    const insertIndex = activeIndex >= 0 ? activeIndex + 1 : this.queue.length;

    const newSteps: ExecutionStep[] = actions.map((action, index) => ({
      step: this.queue.length + index + 1,
      action,
      description: action.replace(/_/g, " "),
      status: "pending" as const,
      attempts: 0
    }));

    this.queue.splice(insertIndex, 0, ...newSteps);
    
    // Re-index steps
    this.queue.forEach((step, idx) => {
      step.step = idx + 1;
    });
  }

  markCompleted(action: ActionType) {
    const step = this.queue.find(s => s.action === action && (s.status === "running" || s.status === "pending"));
    if (step) {
      step.status = "completed";
      this.completed.push(action);
    }
  }

  markFailed(action: ActionType, error: string) {
    const step = this.queue.find(s => s.action === action && (s.status === "running" || s.status === "pending"));
    if (step) {
      step.status = "failed";
      step.error = error;
      this.failed.push({ action, reason: error });
    }
  }
}
