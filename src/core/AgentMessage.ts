import type { AgentType } from "../types/Agent";

export type AgentMessageType =
  | "JOB_EXTRACTED"
  | "RESUME_MATCHED"
  | "COVER_LETTER_GENERATED"
  | "FORM_READY"
  | "RESEARCH_COMPLETED"
  | "ERROR_REPORTED";

export interface AgentMessage<TPayload = unknown> {
  id: string;
  from: AgentType;
  to: AgentType;
  type: AgentMessageType;
  payload: TPayload;
  createdAt: string;
}
