import { memory } from "../ai/memory";
import { executePlan } from "../ai/executor";
import type { AgentState, ExecutionStep, ExecutionPlan } from "../shared/types/agent";

export const AgentManager = {
  async runGoal(goal: string, plan: ExecutionPlan): Promise<AgentState> {
    // 1. Record command in history
    await memory.addCommand(goal);

    // 2. Set active state
    const initialState: AgentState = {
      isActive: true,
      goal,
      currentAgent: "Unknown",
      currentStep: "Formulating execution plan...",
      progress: 5,
      steps: [],
      errors: []
    };
    await memory.updateAgentState(initialState);

    try {
      
      // 4. Map plan actions to execution checklist
      const steps: ExecutionStep[] = plan.actions.map((action, idx) => ({
        step: idx + 1,
        action,
        description: getActionDescription(action),
        status: "pending" as const
      }));

      await memory.updateAgentState({
        steps,
        currentStep: "Plan generated. Commencing execution...",
        progress: 10
      });

      // 5. Hand over to the execution engine
      const finalState = await executePlan(plan, steps, (stepProgress) => {
        // Real-time update callbacks to Chrome local storage
        void memory.updateAgentState(stepProgress);
      });

      // 6. Log execution to history log
      const isSuccess = finalState.errors.length === 0;
      await memory.logExecution(goal, isSuccess ? "completed" : "failed", steps.length);

      // 7. Transition goal state to completed
      const completedState: AgentState = {
        ...finalState,
        isActive: false,
        currentStep: isSuccess 
          ? "Goal completed successfully!" 
          : "Execution finished with errors.",
        progress: 100
      };
      await memory.updateAgentState(completedState);
      return completedState;

    } catch (error) {
      console.error("AgentManager failed to execute goal:", error);
      const errMsg = error instanceof Error ? error.message : "Orchestrated agent flow failed.";
      
      const failedState: AgentState = {
        isActive: false,
        goal,
        currentAgent: "Unknown",
        currentStep: "Execution failed due to internal error.",
        progress: 100,
        steps: [],
        errors: [errMsg]
      };
      await memory.updateAgentState(failedState);
      await memory.logExecution(goal, "failed", 0);
      return failedState;
    }
  }
};

function getActionDescription(action: string): string {
  switch (action) {
    case "extract_job":
      return "Extracting job description details";
    case "match_resume":
      return "Comparing resume qualifications against requirements";
    case "generate_cover_letter":
      return "Generating tailored cover letter draft";
    case "fill_form":
      return "Scanning and mapping webpage forms";
    case "research_company":
      return "Synthesizing company overview and culture insights";
    case "parse_resume":
      return "Extracting candidate profile from resume PDF";
    case "click_element":
      return "Performing element click on webpage";
    case "fill_input":
      return "Populating input value on form field";
    case "extract_text":
      return "Extracting raw text from active webpage";
    case "navigate_page":
      return "Navigating page sections or URLs";
    case "upload_resume":
      return "Locating and highlighting file inputs for resume manual uploads";
    case "chat_fallback":
      return "Generating fallback general conversational response";
    default:
      return "Executing general workflow action";
  }
}
