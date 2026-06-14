export type ActionType =
  | "extract_job"
  | "match_resume"
  | "generate_cover_letter"
  | "fill_form"
  | "research_company"
  | "save_job"
  | "parse_resume"
  | "click_element"
  | "fill_input"
  | "extract_text"
  | "navigate_page"
  | "upload_resume"
  | "chat_fallback"
  | "vision_click"
  | "vision_fill"
  | "vision_analyze";

export type IntentType =
  | "APPLY_JOB"
  | "ANALYZE_JOB"
  | "RESEARCH_COMPANY"
  | "GENERATE_COVER_LETTER"
  | "FILL_FORM"
  | "SAVE_JOB"
  | "SUMMARIZE_PAGE"
  | "CHAT_FALLBACK";

export interface IntentClassification {
  intent: IntentType;
  confidence: number;
  scores: Record<IntentType, number>;
  matchedTerms: string[];
}

export type StepStatus = "pending" | "running" | "completed" | "failed";

export interface ExecutionStep {
  step: number;
  action: ActionType;
  description: string;
  status: StepStatus;
  error?: string;
  attempts?: number;
}

export interface ActionErrorReport {
  action: ActionType;
  reason: string;
  suggestion: string;
  attempts: number;
}
