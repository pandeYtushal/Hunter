import { EventBus } from "../core/EventBus";
import { AgentMetrics } from "../debug/AgentMetrics";
import { ExecutionLogger } from "../debug/ExecutionLogger";
import { PermissionGuard } from "../security/PermissionGuard";
import { storage } from "../shared/storage";
import type { PageSnapshot } from "../shared/types/messages";
import type { AgentState, ExecutionPlan, ExecutionStep, ActionErrorReport, ExecutionContext } from "../shared/types/agent";
import { ToolRegistry, type ToolRuntime } from "./toolRegistry";

const retryLimit = 3;

const getActiveRuntime = async (): Promise<ToolRuntime> => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let pageContext: PageSnapshot | undefined;

  if (tab?.id) {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_SNAPSHOT" }).catch(() => undefined);
    pageContext = response?.snapshot;
  }

  const profile = await storage.get("profile");
  return {
    tab,
    pageContext,
    profile
  };
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

export async function executePlan(
  plan: ExecutionPlan,
  steps: ExecutionStep[],
  onProgress: (state: Partial<AgentState>) => void
): Promise<AgentState> {
  const context: ExecutionContext = {
    plan,
    currentResult: "",
    errors: [] as string[],
    errorReports: [] as ActionErrorReport[]
  };

  for (let i = 0; i < steps.length; i++) {
    const currentState = await chrome.storage.local.get("agentState");
    if (currentState?.agentState && !currentState.agentState.isActive) {
      context.errors.push("Execution cancelled by user.");
      break;
    }

    const step = steps[i];
    const tool = ToolRegistry.get(step.action);
    step.status = "running";
    step.attempts = 0;

    onProgress({
      machineState: "EXECUTING",
      currentAgent: tool.agent,
      currentStep: `Running step ${step.step}: ${tool.description}...`,
      progress: Math.round((i / steps.length) * 85) + 10,
      steps
    });

    let success = false;
    let stepError = "";
    let lastDurationMs = 0;

    for (let attempt = 1; attempt <= retryLimit && !success; attempt++) {
      const startedAt = performance.now();
      step.attempts = attempt;
      await EventBus.emit("ACTION_STARTED", { action: step.action, attempt });

      try {
        const runtime = await getActiveRuntime();
        const permission = PermissionGuard.verifyAction(step.action, runtime.pageContext);
        if (!permission.allowed) {
          throw new Error(permission.reason || "Permission check failed.");
        }

        if (permission.requiresConfirmation) {
          onProgress({
            machineState: "WAITING_CONFIRMATION",
            currentStep: PermissionGuard.createConfirmationMessage(step.action)
          });
        }

        const result = await tool.handler(runtime, context);
        lastDurationMs = Math.round(performance.now() - startedAt);
        context.currentResult = result.result;
        success = true;
        step.status = "completed";

        await AgentMetrics.record(tool.agent, step.action, true, lastDurationMs);
        await ExecutionLogger.log({
          level: "info",
          action: step.action,
          durationMs: lastDurationMs,
          message: `Action ${step.action} completed.`
        });
        await EventBus.emit("ACTION_COMPLETED", { action: step.action, durationMs: lastDurationMs });
      } catch (err) {
        lastDurationMs = Math.round(performance.now() - startedAt);
        stepError = err instanceof Error ? err.message : "Step processing failed.";
        await AgentMetrics.record(tool.agent, step.action, false, lastDurationMs);
        await ExecutionLogger.log({
          level: attempt === retryLimit ? "error" : "warn",
          action: step.action,
          durationMs: lastDurationMs,
          message: `Action ${step.action} attempt ${attempt} failed: ${stepError}`
        });
        await EventBus.emit("ACTION_FAILED", { action: step.action, error: stepError, attempt });
        await new Promise((resolve) => setTimeout(resolve, 350 * attempt));
      }
    }

    if (!success) {
      step.status = "failed";
      step.error = stepError;
      const report = buildErrorReport(step.action, stepError, retryLimit);
      context.errorReports.push(report);
      context.errors.push(`Step ${step.step} (${step.action}) failed: ${stepError}`);
      await ExecutionLogger.log({
        level: "error",
        action: step.action,
        message: `Structured error report generated for ${step.action}.`,
        errorReport: report
      });
    }

    onProgress({ steps, errors: context.errors });
  }

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
