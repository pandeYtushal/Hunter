export type AgentType = "JobAgent" | "ResumeAgent" | "FormAgent" | "ResearchAgent" | "NavigationAgent" | "VisionAgent" | "Unknown";

export interface AgentUsage {
  agent: AgentType;
  actionCount: number;
  successCount: number;
  failureCount: number;
  totalDurationMs: number;
}
