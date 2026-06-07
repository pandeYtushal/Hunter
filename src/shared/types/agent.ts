export type AgentType = "JobAgent" | "ResumeAgent" | "FormAgent" | "ResearchAgent" | "NavigationAgent" | "Unknown";

export type ActionType =
  | "extract_job"
  | "match_resume"
  | "generate_cover_letter"
  | "fill_form"
  | "research_company"
  | "parse_resume"
  | "click_element"
  | "fill_input"
  | "extract_text"
  | "navigate_page"
  | "upload_resume"
  | "chat_fallback";

export type StepStatus = "pending" | "running" | "completed" | "failed";

export interface ExecutionStep {
  step: number;
  action: ActionType;
  description: string;
  status: StepStatus;
  error?: string;
}

export interface ExecutionPlan {
  goal: string;
  agents: AgentType[];
  actions: ActionType[];
}

export interface AgentState {
  isActive: boolean;
  goal: string;
  currentAgent: AgentType;
  currentStep: string;
  progress: number; // 0 - 100
  steps: ExecutionStep[];
  errors: string[];
  finalResult?: string; // Serialized JSON output card
}
