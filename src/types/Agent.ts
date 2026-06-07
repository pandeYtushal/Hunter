export type AgentType = "JobAgent" | "ResumeAgent" | "FormAgent" | "ResearchAgent" | "NavigationAgent" | "Unknown";

export interface AgentUsage {
  agent: AgentType;
  actionCount: number;
  successCount: number;
  failureCount: number;
  totalDurationMs: number;
}
