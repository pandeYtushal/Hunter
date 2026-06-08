import { memory } from "../ai/memory";
import { AgentLoop } from "../ai/agentLoop";
import { ExecutionStateMachine } from "../ai/stateMachine";
import { EventBus } from "../core/EventBus";
import type { AgentState, ExecutionPlan } from "../shared/types/agent";

export const AgentManager = {
  async runGoal(goal: string, plan: ExecutionPlan): Promise<AgentState> {
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

function getActionDescription(action: string): string {
  switch (action) {
    case "extract_job": return "Extracting job description details";
    case "match_resume": return "Comparing resume qualifications against requirements";
    case "generate_cover_letter": return "Generating tailored cover letter draft";
    case "fill_form": return "Scanning and mapping webpage forms";
    case "research_company": return "Synthesizing company overview and culture insights";
    case "save_job": return "Saving job to application tracker";
    case "parse_resume": return "Extracting candidate profile from resume PDF";
    case "click_element": return "Performing element click on webpage";
    case "fill_input": return "Populating input value on form field";
    case "extract_text": return "Extracting raw text from active webpage";
    case "navigate_page": return "Navigating page sections or URLs";
    case "upload_resume": return "Locating and highlighting file inputs for resume manual uploads";
    case "chat_fallback": return "Generating fallback general conversational response";
    default: return "Executing general workflow action";
  }
}
