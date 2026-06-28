import { memory } from "../ai/memory";
import { AgentLoop } from "../ai/agentLoop";
import { ExecutionStateMachine } from "../ai/stateMachine";
import { EventBus } from "../core/EventBus";
import type { AgentState, ExecutionPlan } from "../shared/types/agent";
import { AIManager } from "../ai/core/AIManager";

export const AgentManager = {
  async runGoal(goal: string, plan: ExecutionPlan): Promise<AgentState> {
    AIManager.getInstance().resetSessionTokens();
    const machine = new ExecutionStateMachine();
    await memory.addCommand(goal);
    machine.transition("PLANNING");
    await EventBus.emit("PLAN_CREATED", { plan });

    const initialState: AgentState = {
      isActive: true,
      goal,
      currentAgent: "Unknown",
      currentStep: "Initiating Reasoning Agent Loop...",
      progress: 5,
      steps: [],
      errors: [],
      machineState: machine.current()
    };
    await memory.updateAgentState(initialState);

    try {
      machine.transition("EXECUTING");
      await memory.updateAgentState({
        currentStep: "Commencing dynamic reasoning loop...",
        progress: 10,
        machineState: machine.current()
      });

      const finalState = await AgentLoop.run(goal, (stepProgress) => {
        void memory.updateAgentState({
          ...stepProgress
        });
      });

      const isSuccess = finalState.errors.length === 0;
      await memory.logExecution(goal, isSuccess ? "completed" : "failed", finalState.steps.length);

      machine.transition(isSuccess ? "COMPLETED" : "FAILED");
      const completedState: AgentState = {
        ...finalState,
        isActive: false,
        currentStep: isSuccess
          ? "All reasoning agent loops completed successfully!"
          : "Execution finished with errors.",
        progress: 100,
        machineState: machine.current()
      };
      await memory.updateAgentState(completedState);
      return completedState;

    } catch (error) {
      console.error("AgentManager failed to execute goal:", error);
      const errMsg = error instanceof Error ? error.message : "Orchestrated agent flow failed.";
      if (machine.canTransition("FAILED")) {
        machine.transition("FAILED");
      }

      const failedState: AgentState = {
        isActive: false,
        goal,
        currentAgent: "Unknown",
        currentStep: "Execution failed due to internal error.",
        progress: 100,
        steps: [],
        errors: [errMsg],
        machineState: machine.current()
      };
      await memory.updateAgentState(failedState);
      await memory.logExecution(goal, "failed", 0);
      return failedState;
    }
  }
};
