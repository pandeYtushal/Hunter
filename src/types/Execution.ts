import type { ActionErrorReport, ExecutionStep } from "./Action";
import type { AgentType } from "./Agent";
import type { ExecutionPlan, PlanGoal } from "./Plan";
import type { JobAgentOutput, MatchAnalysis } from "./Job";
import type { CoverLetterRecord } from "./storageCompat";

export type ExecutionMachineState =
  | "IDLE"
  | "PLANNING"
  | "EXECUTING"
  | "WAITING_CONFIRMATION"
  | "COMPLETED"
  | "FAILED";

export interface AgentState {
  isActive: boolean;
  goal: PlanGoal | string;
  currentAgent: AgentType;
  currentStep: string;
  progress: number;
  steps: ExecutionStep[];
  errors: string[];
  machineState?: ExecutionMachineState;
  finalResult?: string;
}

export interface AutofillProposal {
  tempId: string;
  labelText: string;
  mappedType: string;
  fillValue: string;
  tagName: string;
}

export interface AutofillReport {
  proposals: AutofillProposal[];
  highlighted: string[];
  skipped: string[];
}

export interface ExecutionContext {
  plan: ExecutionPlan;
  extractedJob?: JobAgentOutput;
  matchAnalysis?: MatchAnalysis;
  coverLetterRecord?: CoverLetterRecord;
  formAutofillReport?: AutofillReport;
  currentResult: string;
  errors: string[];
  errorReports: ActionErrorReport[];
}
