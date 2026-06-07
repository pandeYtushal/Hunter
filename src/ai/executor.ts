import { EventBus } from "../core/EventBus";
import { AgentMetrics } from "../debug/AgentMetrics";
import { ExecutionLogger } from "../debug/ExecutionLogger";
import { PermissionGuard } from "../security/PermissionGuard";
import { storage } from "../shared/storage";
import type { PageSnapshot } from "../shared/types/messages";
import type { AgentState, ExecutionPlan, ExecutionStep, ActionErrorReport, ExecutionContext } from "../shared/types/agent";
import { ToolRegistry, type ToolRuntime } from "./toolRegistry";
import { ObservationEngine } from "./observationEngine";
import { ReflectionEngine } from "./reflectionEngine";
import { SelfHealing } from "./selfHealing";
import { GoalTracker, type GoalProgress } from "./goalTracker";
import { ExecutionMemory } from "./executionMemory";
import type { ActionType } from "../types";

const retryLimit = 3;

const getActiveRuntime = async (): Promise<ToolRuntime> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let pageContext: PageSnapshot | undefined;

  if (tab?.id) {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_SNAPSHOT" }).catch(() => undefined);
    pageContext = response?.snapshot;
  }

  const profile = await storage.get("profile");
  return { tab, pageContext, profile };
};

const buildErrorReport = (action: ExecutionStep["action"], reason: string, attempts: number): ActionErrorReport => ({
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

// Execution metrics tracked during the run for the Developer Panel
export interface ExecutionRunMetrics {
  goalProgress: GoalProgress;
  failureCount: number;
  replanCount: number;
  recoveryCount: number;
}

export async function executePlan(
  plan: ExecutionPlan,
  steps: ExecutionStep[],
  onProgress: (state: Partial<AgentState>, metrics?: ExecutionRunMetrics) => void
): Promise<AgentState> {
  const context: ExecutionContext = {
    plan,
    currentResult: "",
    errors: [] as string[],
    errorReports: [] as ActionErrorReport[]
  };

  // --- Reflection & Replanning state ---
  let goalProgress = GoalTracker.initialize(plan.goal, plan.actions as string[]);
  const failures: { action: ActionType; reason: string }[] = [];
  let replanCount = 0;
  let recoveryCount = 0;

  // Dynamic queue: we may grow or replace this list during healing
  let actionQueue: ActionType[] = [...plan.actions];
  const completedActions: ActionType[] = [];
  let stepIndex = 0;

  while (stepIndex < actionQueue.length) {
    // Check for user cancellation
    const currentState = await chrome.storage.local.get("agentState");
    if (currentState?.agentState && !currentState.agentState.isActive) {
      context.errors.push("Execution cancelled by user.");
      break;
    }

    const action = actionQueue[stepIndex];

    // Find or synthesise matching ExecutionStep record
    let step = steps.find((s) => s.action === action && s.status === "pending");
    if (!step) {
      // Synthesise a new step (injected by replanner / self-healing)
      const newStep: ExecutionStep = {
        step: steps.length + 1,
        action,
        description: action.replace(/_/g, " "),
        status: "pending"
      };
      steps.push(newStep);
      step = newStep;
    }

    const tool = ToolRegistry.get(action);
    step.status = "running";
    step.attempts = 0;

    goalProgress = GoalTracker.updateProgress(goalProgress, action, "running");

    const runMetrics: ExecutionRunMetrics = {
      goalProgress,
      failureCount: failures.length,
      replanCount,
      recoveryCount
    };

    onProgress(
      {
        machineState: "EXECUTING",
        currentAgent: tool.agent,
        currentStep: `Running: ${tool.description}...`,
        progress: Math.round((stepIndex / actionQueue.length) * 85) + 10,
        steps
      },
      runMetrics
    );

    let success = false;
    let stepError = "";
    let lastDurationMs = 0;
    let currentAttempt = 0;

    while (currentAttempt < retryLimit && !success) {
      currentAttempt++;
      const startedAt = performance.now();
      step.attempts = currentAttempt;
      await EventBus.emit("ACTION_STARTED", { action, attempt: currentAttempt });

      try {
        const runtime = await getActiveRuntime();
        const permission = PermissionGuard.verifyAction(action, runtime.pageContext);
        if (!permission.allowed) {
          throw new Error(permission.reason || "Permission check failed.");
        }

        if (permission.requiresConfirmation) {
          onProgress({
            machineState: "WAITING_CONFIRMATION",
            currentStep: PermissionGuard.createConfirmationMessage(action)
          }, runMetrics);
        }

        const result = await tool.handler(runtime, context);
        lastDurationMs = Math.round(performance.now() - startedAt);
        context.currentResult = result.result;

        // --- Observation Loop ---
        const observation = await ObservationEngine.observe(action, result.result, runtime.pageContext);
        const reflection = ReflectionEngine.reflect(observation, currentAttempt, retryLimit);

        await AgentMetrics.record(tool.agent, action, observation.status !== "FAILURE", lastDurationMs);
        await ExecutionLogger.log({
          level: observation.status === "FAILURE" ? "warn" : "info",
          action,
          durationMs: lastDurationMs,
          message: `Action ${action} observation: ${observation.status}. Reflection: ${reflection.status}`
        });
        await EventBus.emit("ACTION_COMPLETED", { action, durationMs: lastDurationMs });

        if (reflection.status === "success") {
          success = true;
          step.status = "completed";
          completedActions.push(action);
          goalProgress = GoalTracker.updateProgress(goalProgress, action, "completed");

        } else if (reflection.status === "retry") {
          // Reflection says retry — loop will continue with incremented attempt
          stepError = reflection.reason || "Partial result, retrying.";
          recoveryCount++;
          await new Promise((resolve) => setTimeout(resolve, 350 * currentAttempt));

        } else {
          // reflection.status === "replan" — trigger self-healing
          stepError = reflection.reason || "Action requires replanning.";
          const memoryContext = await ExecutionMemory.getContextForGoal(plan.goal);
          const healing = await SelfHealing.heal(
            plan.goal,
            plan,
            action,
            stepError,
            currentAttempt,
            completedActions,
            runtime.pageContext,
            memoryContext
          );

          replanCount++;
          recoveryCount++;

          await ExecutionLogger.log({
            level: "warn",
            action,
            message: `Self-healing triggered. Strategy: ${healing.strategy}. ${healing.explanation}`
          });
          await EventBus.emit("ACTION_FAILED", { action, error: stepError, attempt: currentAttempt });

          if (healing.strategy !== "retry" && healing.newActions && healing.newActions.length > 0) {
            // Replace remaining queue with the healed plan
            actionQueue = [
              ...completedActions,
              ...healing.newActions.filter((a) => !completedActions.includes(a))
            ];
            stepIndex = completedActions.length - 1; // will be incremented below
            failures.push({ action, reason: stepError });
            step.status = "failed";
            step.error = stepError;
            goalProgress = GoalTracker.updateProgress(goalProgress, action, "failed", true, stepError);
            break; // break retry loop, continue outer queue
          }

          // If healing strategy is "retry" continue the inner loop
          await new Promise((resolve) => setTimeout(resolve, 350 * currentAttempt));
        }

      } catch (err) {
        lastDurationMs = Math.round(performance.now() - startedAt);
        stepError = err instanceof Error ? err.message : "Step processing failed.";
        await AgentMetrics.record(tool.agent, action, false, lastDurationMs);
        await ExecutionLogger.log({
          level: currentAttempt === retryLimit ? "error" : "warn",
          action,
          durationMs: lastDurationMs,
          message: `Action ${action} attempt ${currentAttempt} threw: ${stepError}`
        });
        await EventBus.emit("ACTION_FAILED", { action, error: stepError, attempt: currentAttempt });
        await new Promise((resolve) => setTimeout(resolve, 350 * currentAttempt));
      }
    }

    if (!success && step.status !== "failed") {
      step.status = "failed";
      step.error = stepError;
      failures.push({ action, reason: stepError });
      goalProgress = GoalTracker.updateProgress(goalProgress, action, "failed", true, stepError);
      const report = buildErrorReport(action, stepError, currentAttempt);
      context.errorReports.push(report);
      context.errors.push(`Step (${action}) failed: ${stepError}`);
      await ExecutionLogger.log({
        level: "error",
        action,
        message: `Structured error report generated for ${action}.`,
        errorReport: report
      });
    }

    const finalMetrics: ExecutionRunMetrics = {
      goalProgress,
      failureCount: failures.length,
      replanCount,
      recoveryCount
    };
    onProgress({ steps, errors: context.errors }, finalMetrics);
    stepIndex++;
  }

  // Save execution memory record
  const planStatus = context.errors.length === 0 ? "success" : "failed";
  await ExecutionMemory.recordPlan(
    plan.goal,
    plan.actions as ActionType[],
    planStatus,
    failures,
    actionQueue.length !== plan.actions.length ? (actionQueue as ActionType[]) : undefined
  );

  let finalResult = context.currentResult;
  if (plan.goal === "apply_job") {
    finalResult = JSON.stringify({
      type: "orchestration_result",
      summary: `Autonomous application flow steps finalized for: ${
        context.extractedJob?.title || "job"
      } at ${context.extractedJob?.company || "company"}.`,
      job: context.extractedJob,
      match: context.matchAnalysis,
      coverLetter: context.coverLetterRecord,
      autofill: context.formAutofillReport,
      errors: context.errors.length > 0 ? context.errors : undefined,
      errorReports: context.errorReports.length > 0 ? context.errorReports : undefined
    });
  }

  return {
    isActive: false,
    goal: plan.goal,
    currentAgent: "Unknown",
    currentStep: context.errors.length > 0 ? "Execution finished with errors." : "All actions completed successfully!",
    progress: 100,
    steps,
    errors: context.errors,
    machineState: context.errors.length > 0 ? "FAILED" : "COMPLETED",
    finalResult
  };
}
