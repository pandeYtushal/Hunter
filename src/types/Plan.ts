import type { ActionType, IntentClassification } from "./Action";
import type { AgentType } from "./Agent";

export type PlanGoal =
  | "apply_job"
  | "analyze_job_match"
  | "research_company"
  | "generate_cover_letter"
  | "autofill_form"
  | "save_job"
  | "summarize_page"
  | "chat_fallback"
  | "navigate"
  | "click"
  | "scroll"
  | "type"
  | "edit"
  | "search"
  | "upload"
  | "download"
  | "read"
  | "observe";

export interface ExecutionPlan {
  goal: PlanGoal;
  agents: AgentType[];
  actions: ActionType[];
  intent?: IntentClassification;
  query?: string;
}
