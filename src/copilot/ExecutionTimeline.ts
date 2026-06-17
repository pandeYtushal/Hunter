import type { CopilotTask } from "./TaskScheduler";

export interface TimelineEntry {
  id: string;
  name: string;
  status: CopilotTask["status"];
  description: string;
  active: boolean;
}

export class ExecutionTimeline {
  generate(tasks: CopilotTask[]): TimelineEntry[] {
    return tasks.map((t) => ({
      id: t.id,
      name: t.name,
      status: t.status,
      description: t.description || t.name,
      active: t.status === "running" || t.status === "waiting_confirmation"
    }));
  }

  getRunningStep(tasks: CopilotTask[]): CopilotTask | null {
    return tasks.find((t) => t.status === "running") || null;
  }

  getWaitingStep(tasks: CopilotTask[]): CopilotTask | null {
    return tasks.find((t) => t.status === "waiting_confirmation") || null;
  }
}
