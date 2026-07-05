import { memory } from "../ai/memory";
import { PipelineOrchestrator } from "../ai/automation/PipelineOrchestrator";
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

      const { SupervisorAgent } = await import("../ai/concurrency/SupervisorAgent");
      const taskIds = await SupervisorAgent.analyzeAndSchedule(goal);

      let allFinished = false;
      let finalAgentState = initialState;

      while (!allFinished) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        if (typeof chrome === "undefined" || !chrome.storage?.local) break;
        
        const data = await chrome.storage.local.get("concurrentTasks");
        const tasks = data?.concurrentTasks || [];
        const activeTasks = tasks.filter((t: any) => taskIds.includes(t.id));
        
        allFinished = activeTasks.every((t: any) => ["completed", "failed", "cancelled"].includes(t.status));
        
        const running = activeTasks.filter((t: any) => t.status === "running");
        const failed = activeTasks.filter((t: any) => t.status === "failed");
        const completed = activeTasks.filter((t: any) => t.status === "completed");

        const progressPercent = Math.round((completed.length / (activeTasks.length || 1)) * 90) + 10;

        finalAgentState = {
          isActive: !allFinished,
          goal,
          currentAgent: "Unknown",
          currentStep: running[0]
            ? `Executing tasks: ${running.map((r: any) => `"${r.goal}"`).join(", ")}`
            : "Tasks scheduling and synchronization...",
          progress: Math.min(100, progressPercent),
          steps: activeTasks.map((t: any, idx: number) => ({
            step: idx + 1,
            action: "chat_fallback",
            description: `${t.goal} (${t.status})`,
            status: t.status === "running" ? "running" : t.status === "completed" ? "completed" : "pending"
          })),
          errors: failed.map((t: any) => t.errors.join("; ")),
          machineState: allFinished ? (failed.length > 0 ? "FAILED" : "COMPLETED") : "EXECUTING"
        };

        void memory.updateAgentState(finalAgentState);
      }

      const finalState = finalAgentState;

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
