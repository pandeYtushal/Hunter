import { storage } from "../shared/storage";
import type { ActionErrorReport, ActionType } from "../types/Action";

export interface ExecutionLogEntry {
  id: string;
  timestamp: string;
  level: "info" | "warn" | "error";
  message: string;
  action?: ActionType;
  durationMs?: number;
  errorReport?: ActionErrorReport;
}

const maxEntries = 100;

export const ExecutionLogger = {
  async log(entry: Omit<ExecutionLogEntry, "id" | "timestamp">): Promise<void> {
    const logs = await storage.get("executionLogs");
    const next: ExecutionLogEntry[] = [
      {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        ...entry
      },
      ...(logs ?? [])
    ].slice(0, maxEntries);

    await storage.set("executionLogs", next);
  },

  async read(): Promise<ExecutionLogEntry[]> {
    return storage.get("executionLogs");
  }
};
