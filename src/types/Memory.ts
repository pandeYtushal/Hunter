import type { AgentState } from "./Execution";

export interface StoredCoverLetter {
  id: string;
  company: string;
  role: string;
  content: string;
  createdAt: string;
}

export interface LoggedGoal {
  timestamp: string;
  goal: string;
  status: "completed" | "failed";
  stepsCount: number;
}

export interface LongTermMemory {
  userPreferences: Record<string, string | number | boolean | string[]>;
  favoriteCompanies: string[];
  successfulApplications: string[];
  savedJobs: string[];
  generatedCoverLetters: StoredCoverLetter[];
  updatedAt: string;
}

export interface MemorySnapshot {
  recentCommands: string[];
  executionHistory: LoggedGoal[];
  agentState: AgentState | null;
  longTermMemory: LongTermMemory;
}
