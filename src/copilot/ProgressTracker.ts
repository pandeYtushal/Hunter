import type { CopilotTask } from "./TaskScheduler";

export class ProgressTracker {
  private totalSteps = 0;
  private completedSteps = 0;
  private isBlocked = false;
  private blockReason?: string;

  update(tasks: CopilotTask[]): void {
    this.totalSteps = tasks.length;
    this.completedSteps = tasks.filter((t) => t.status === "completed").length;
    
    const blockedTask = tasks.find((t) => t.status === "failed");
    if (blockedTask) {
      this.isBlocked = true;
      this.blockReason = blockedTask.error || `Task "${blockedTask.name}" failed.`;
    } else {
      this.isBlocked = false;
      this.blockReason = undefined;
    }
  }

  getCompletionPercentage(): number {
    if (this.totalSteps === 0) return 0;
    return Math.round((this.completedSteps / this.totalSteps) * 100);
  }

  getRemainingStepsCount(): number {
    return Math.max(0, this.totalSteps - this.completedSteps);
  }

  getEstimatedTimeLeftSeconds(): number {
    // Basic estimate: assume average of 15 seconds per remaining step
    return this.getRemainingStepsCount() * 15;
  }

  getBlockState() {
    return {
      isBlocked: this.isBlocked,
      blockReason: this.blockReason
    };
  }
}
