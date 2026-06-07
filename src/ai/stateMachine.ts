import type { ExecutionMachineState } from "../types/Execution";

const validTransitions: Record<ExecutionMachineState, ExecutionMachineState[]> = {
  IDLE: ["PLANNING"],
  PLANNING: ["EXECUTING", "FAILED", "IDLE"],
  EXECUTING: ["WAITING_CONFIRMATION", "COMPLETED", "FAILED"],
  WAITING_CONFIRMATION: ["EXECUTING", "COMPLETED", "FAILED"],
  COMPLETED: ["IDLE", "PLANNING"],
  FAILED: ["IDLE", "PLANNING"]
};

export class ExecutionStateMachine {
  private state: ExecutionMachineState;

  constructor(initialState: ExecutionMachineState = "IDLE") {
    this.state = initialState;
  }

  current(): ExecutionMachineState {
    return this.state;
  }

  canTransition(to: ExecutionMachineState): boolean {
    return validTransitions[this.state].includes(to);
  }

  transition(to: ExecutionMachineState): ExecutionMachineState {
    if (!this.canTransition(to)) {
      throw new Error(`Invalid agent state transition: ${this.state} -> ${to}`);
    }
    this.state = to;
    return this.state;
  }
}
