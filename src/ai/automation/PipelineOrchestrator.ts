import { AutomationPlanner } from "./AutomationPlanner";
import { AutomationExecutor } from "./AutomationExecutor";
import { AutomationReflection } from "./AutomationReflection";
import { AutomationRetry } from "./AutomationRetry";
import { ActionQueue } from "./ActionQueue";
import { memory } from "../memory";
import { storage } from "../../shared/storage";
import { EventBus } from "../../core/EventBus";
import { AgentMetrics } from "../../debug/AgentMetrics";
import { ExecutionLogger } from "../../debug/ExecutionLogger";
import { ExecutionMemory } from "../executionMemory";
import { GoalTracker, type GoalProgress } from "../goalTracker";
import type { PageSnapshot } from "../../shared/types/messages";
import type { AgentState } from "../../shared/types/agent";
import type { ActionType, ActionErrorReport, ExecutionStep } from "../../types/Action";
import { evaluateDomConfidence, DOM_CONFIDENCE_THRESHOLD } from "../domConfidence";
import { ContextRetrieval } from "../memory/ContextRetrieval";
import { LongTermMemoryService } from "../memory/LongTermMemoryService";
import { SessionReplayLogger } from "../production/SessionReplayLogger";

const retryLimit = 3;
const maxIterations = 10;

const getActiveRuntime = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let pageContext: PageSnapshot | undefined;

  if (tab?.id) {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_SNAPSHOT" }).catch(() => undefined);
    pageContext = response?.snapshot;
  }

  const profile = await storage.get("profile");
  return { tab, pageContext, profile };
};

const buildErrorReport = (action: ActionType, reason: string, attempts: number): ActionErrorReport => ({
  action,
  reason,
  attempts,
  suggestion:
    reason.includes("profile")
      ? "Complete your Hunter profile and upload or paste resume details, then rerun the action."
      : reason.includes("page")
      ? "Refresh the tab, confirm the page is a normal http/https page, and try again."
      : "Retry the workflow after checking the active tab and extension permissions."
});

export class PipelineOrchestrator {
  static async run(
    goal: string,
    onProgress: (state: Partial<AgentState>) => void,
    taskId?: string
  ): Promise<AgentState> {
    
    // 1. Initialize Context
    const context = {
      plan: { goal, agents: [], actions: [] },
      currentResult: "",
      errors: [] as string[],
      errorReports: [] as ActionErrorReport[]
    };

    SessionReplayLogger.clearActiveSession();

    let enrichedGoal = goal;
    try {
      const activeRuntime = await getActiveRuntime();
      const retrieval = await ContextRetrieval.retrieve(goal, activeRuntime.pageContext?.url);
      if (retrieval.injectedContextPrompt) {
        enrichedGoal = `${goal}\n${retrieval.injectedContextPrompt}`;
      }
    } catch (e) {
      console.warn("PipelineOrchestrator context retrieval failed:", e);
    }

    // 2. Planner: generate plan & instantiate Action Queue
    const { plan, queue } = await AutomationPlanner.createQueue(enrichedGoal);
    context.plan = plan as any;

    let goalProgress = GoalTracker.initialize(goal, plan.actions);
    let iteration = 0;
    
    onProgress({
      machineState: "EXECUTING",
      currentStep: "Plan initialized. Commencing browser automation pipeline...",
      progress: 10,
      steps: queue.getSteps(),
      goalProgress
    });

    while (iteration < maxIterations && !queue.isEmpty()) {
      iteration++;

      if (taskId) {
        let isPaused = true;
        while (isPaused) {
          const data = await chrome.storage.local.get("concurrentTasks");
          const tasks = data?.concurrentTasks || [];
          const task = tasks.find((t: any) => t.id === taskId);
          if (!task) {
            break;
          }
          if (task.status === "cancelled") {
            context.errors.push("Execution cancelled by user.");
            break;
          }
          if (task.status === "paused") {
            await new Promise(resolve => setTimeout(resolve, 500));
          } else {
            isPaused = false;
          }
        }
        if (context.errors.includes("Execution cancelled by user.")) {
          break;
        }
      } else {
        const currentState = await chrome.storage.local.get("agentState");
        if (currentState?.agentState && !currentState.agentState.isActive) {
          context.errors.push("Execution cancelled by user.");
          break;
        }
      }

      // Fetch runtime context
      const runtime = await getActiveRuntime();
      const nextStep = queue.next();
      if (!nextStep) break;

      let currentAction = nextStep.action;
      
      // Intercept low DOM confidence and upgrade click/fill commands to vision counterparts
      const domConfidence = evaluateDomConfidence(runtime.pageContext);
      if (domConfidence < DOM_CONFIDENCE_THRESHOLD) {
        if (currentAction === "click_element") {
          currentAction = "vision_click";
        } else if (currentAction === "fill_input" || currentAction === "fill_form") {
          currentAction = "vision_fill";
        }
      }

      nextStep.status = "running";
      goalProgress = GoalTracker.updateProgress(goalProgress, currentAction, "running");

      onProgress({
        machineState: "EXECUTING",
        currentAgent: "NavigationAgent",
        currentStep: `Executing pipeline action: ${currentAction.replace(/_/g, " ")}`,
        progress: Math.min(95, Math.round((iteration / maxIterations) * 85) + 10),
        steps: queue.getSteps(),
        goalProgress
      });

      let success = false;
      let stepError = "";
      let lastDurationMs = 0;
      let attempt = 0;

      while (attempt < retryLimit && !success) {
        attempt++;
        const startedAt = performance.now();
        nextStep.attempts = attempt;
        await EventBus.emit("ACTION_STARTED", { action: currentAction, attempt });

        // 3. Executor: execute current action
        const executionResult = await AutomationExecutor.execute(
          currentAction,
          runtime,
          context as any,
          (msg, state) => {
            onProgress({
              machineState: (state as any) || "EXECUTING",
              currentStep: msg
            });
          }
        );

        lastDurationMs = Math.round(performance.now() - startedAt);

        if (executionResult.success) {
          context.currentResult = executionResult.result;

          // 4. Reflection: observe and verify action outcomes
          const reflection = await AutomationReflection.reflect(
            currentAction,
            executionResult.result,
            runtime.pageContext,
            attempt,
            retryLimit
          );

          await AgentMetrics.record(currentAction.includes("vision") ? "VisionAgent" : "NavigationAgent", currentAction, reflection.status === "success", lastDurationMs);
          await ExecutionLogger.log({
            level: reflection.status === "success" ? "info" : "warn",
            action: currentAction,
            durationMs: lastDurationMs,
            message: `Reflection evaluation outcome: ${reflection.status}.`
          });

          if (reflection.status === "success") {
            success = true;
            queue.markCompleted(currentAction);
            goalProgress = GoalTracker.updateProgress(goalProgress, currentAction, "completed");
            await EventBus.emit("ACTION_COMPLETED", { action: currentAction, durationMs: lastDurationMs });
          } else {
            stepError = reflection.reason || "Action reflection failed success checks.";
            
            // 5. Retry / Healing strategy
            const healing = await AutomationRetry.handleFailure(
              goal,
              plan,
              currentAction,
              stepError,
              attempt,
              queue,
              runtime.pageContext
            );

            if (healing.strategy === "retry") {
              await AutomationRetry.applyBackoff(attempt);
            } else {
              break;
            }
          }
        } else {
          // Execution failed
          stepError = executionResult.error || "Action execution encountered an error.";
          await AgentMetrics.record(currentAction.includes("vision") ? "VisionAgent" : "NavigationAgent", currentAction, false, lastDurationMs);
          
          const healing = await AutomationRetry.handleFailure(
            goal,
            plan,
            currentAction,
            stepError,
            attempt,
            queue,
            runtime.pageContext
          );

          if (healing.strategy === "retry") {
            await AutomationRetry.applyBackoff(attempt);
          } else {
            break;
          }
        }
      }

      if (!success) {
        queue.markFailed(currentAction, stepError);
        goalProgress = GoalTracker.updateProgress(goalProgress, currentAction, "failed", true, stepError);
        const report = buildErrorReport(currentAction, stepError, attempt);
        context.errorReports.push(report);
        context.errors.push(`Step (${currentAction}) failed: ${stepError}`);
        await EventBus.emit("ACTION_FAILED", { action: currentAction, error: stepError, attempt });
      }
      SessionReplayLogger.recordStep(
        currentAction,
        lastDurationMs,
        currentAction.startsWith("vision_") ? 0.68 : 0.94,
        success ? "success" : "failed"
      );
      // Update state in storage to keep popup/sidebar components synced
      await memory.updateAgentState({
        steps: queue.getSteps(),
        goalProgress
      });
    }

    // Save final execution memory record
    const planStatus = context.errors.length === 0 ? "success" : "failed";
    await ExecutionMemory.recordPlan(
      plan.goal,
      plan.actions as ActionType[],
      planStatus,
      context.errors.map(err => ({ action: plan.actions[0] || "chat_fallback", reason: err })),
      queue.getSteps().map(s => s.action)
    );

    // Save successful path inside Long-Term Memory
    if (context.errors.length === 0) {
      try {
        const finalRuntime = await getActiveRuntime();
        await LongTermMemoryService.recordSuccessfulPath(
          goal,
          finalRuntime.pageContext?.url || "",
          queue.getSteps().map((s) => s.action)
        );
        if (finalRuntime.pageContext?.url) {
          await LongTermMemoryService.recordVisit(finalRuntime.pageContext.url);
        }
      } catch (err) {
        console.warn("PipelineOrchestrator failed to save successful path to long-term memory:", err);
      }
    }

    const hasErrors = context.errors.length > 0;
    const isSuccess = !hasErrors;

    let finalResult = context.currentResult;
    if (goal.toLowerCase().includes("apply") || goal.toLowerCase().includes("fill")) {
      finalResult = JSON.stringify({
        type: "orchestration_result",
        summary: `Browser automation pipeline finalized goal: "${goal}".`,
        job: context.errors.length === 0 ? context.currentResult : undefined,
        errors: context.errors.length > 0 ? context.errors : undefined,
        errorReports: context.errorReports.length > 0 ? context.errorReports : undefined
      });
    }

    await SessionReplayLogger.finalizeSession(goal);

    return {
      isActive: false,
      goal,
      currentAgent: "NavigationAgent",
      currentStep: isSuccess ? "All automation pipeline actions completed successfully!" : "Automation completed with failures.",
      progress: 100,
      steps: queue.getSteps(),
      errors: context.errors,
      machineState: isSuccess ? "COMPLETED" : "FAILED",
      finalResult
    };
  }
}
