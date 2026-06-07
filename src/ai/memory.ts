import type { AgentState } from "../shared/types/agent";

export interface LoggedGoal {
  timestamp: string;
  goal: string;
  status: "completed" | "failed";
  stepsCount: number;
}

export const memory = {
  getRecentCommands: async (): Promise<string[]> => {
    const data = await chrome.storage.local.get({ recentCommands: [] });
    return data.recentCommands as string[];
  },

  addCommand: async (command: string): Promise<void> => {
    const commands = await memory.getRecentCommands();
    const updated = [command, ...commands.filter((c) => c !== command)].slice(0, 10);
    await chrome.storage.local.set({ recentCommands: updated });
  },

  getExecutionHistory: async (): Promise<LoggedGoal[]> => {
    const data = await chrome.storage.local.get({ executionHistory: [] });
    return data.executionHistory as LoggedGoal[];
  },

  logExecution: async (goal: string, status: "completed" | "failed", stepsCount: number): Promise<void> => {
    const history = await memory.getExecutionHistory();
    const newEntry: LoggedGoal = {
      timestamp: new Date().toISOString(),
      goal,
      status,
      stepsCount
    };
    await chrome.storage.local.set({ executionHistory: [newEntry, ...history].slice(0, 50) });
  },

  getAgentState: async (): Promise<AgentState | null> => {
    const data = await chrome.storage.local.get("agentState");
    return (data.agentState as AgentState) || null;
  },

  updateAgentState: async (state: Partial<AgentState>): Promise<void> => {
    const currentState = (await memory.getAgentState()) || {
      isActive: false,
      goal: "",
      currentAgent: "Unknown" as const,
      currentStep: "",
      progress: 0,
      steps: [],
      errors: []
    };
    const updated: AgentState = { ...currentState, ...state };
    await chrome.storage.local.set({ agentState: updated });
  }
};
