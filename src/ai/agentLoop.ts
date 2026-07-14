import { ContextBuilder, type DecisionLogEntry } from "./contextBuilder";
import { ReasoningEngine } from "./reasoningEngine";
import { ToolSelector } from "./toolSelector";
import { ToolRegistry } from "./toolRegistry";
import { ObservationEngine } from "./observationEngine";
import { ReflectionEngine } from "./reflectionEngine";
import { ConfidenceScoring } from "./confidenceScoring";
import { GoalTracker, type GoalProgress } from "./goalTracker";
import { memory } from "./memory";
import { storage } from "../shared/storage";
import type { AgentState, ExecutionStep } from "../types";
import type { PageSnapshot } from "../shared/types/messages";
import { PermissionGuard } from "../security/PermissionGuard";
import { EventBus } from "../core/EventBus";
import { AgentMetrics } from "../debug/AgentMetrics";
import { ExecutionLogger } from "../debug/ExecutionLogger";
import type { ActionType, ActionErrorReport } from "../types/Action";
import { evaluateDomConfidence, DOM_CONFIDENCE_THRESHOLD } from "./domConfidence";

const retryLimit = 3;
const maxIterations = 10;

const getActiveRuntime = async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  let pageContext: PageSnapshot | undefined;

  if (tab?.id) {
    const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_SNAPSHOT" }).catch(() => undefined);
    pageContext = response?.snapshot;
  }

  // Multi-Tab Intelligence: query all tabs in the active window
  let openTabs: Array<{ title: string; url: string; active: boolean }> = [];
  if (typeof chrome !== "undefined" && chrome.tabs) {
    try {
      const allTabs = await new Promise<chrome.tabs.Tab[]>((resolve) => {
        chrome.tabs.query({ currentWindow: true }, (tabs) => resolve(tabs || []));
      });
      openTabs = allTabs
        .map((t) => ({
          title: t.title || "",
          url: t.url || "",
          active: !!t.active
        }))
        .filter((t) => t.url && (t.url.startsWith("http://") || t.url.startsWith("https://")));
    } catch (e) {
      console.warn("Failed to query open tabs:", e);
    }
  }

  const profile = await storage.get("profile");
  const longTermMemory = await storage.get("longTermMemory").catch(() => null);

  return { tab, pageContext, profile, openTabs, longTermMemory };
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

export const AgentLoop = {
  /**
   * Runs the main cognitive agent reasoning loop.
   */
  async run(
    goal: string,
    onProgress: (state: Partial<AgentState>) => void
  ): Promise<AgentState> {
    const context = {
      plan: { goal, agents: [], actions: [] }, // placeholder
      currentResult: "",
      errors: [] as string[],
      errorReports: [] as ActionErrorReport[]
    };

    const steps: ExecutionStep[] = [];
    const decisionHistory: DecisionLogEntry[] = [];
    let consecutiveFailures = 0;
    let iteration = 0;
    let isComplete = false;

    let goalProgress: GoalProgress = {
      goal,
      subGoals: [],
      completionPercentage: 0,
      isBlocked: false
    };

    while (iteration < maxIterations && !isComplete) {
      iteration++;

      // 1. Check for user cancellation
      const currentState = await chrome.storage.local.get("agentState");
      if (currentState?.agentState && !currentState.agentState.isActive) {
        context.errors.push("Execution cancelled by user.");
        break;
      }

      // 2. Fetch runtime context
      const runtime = await getActiveRuntime();

      // 3. Build Context
      const contextString = ContextBuilder.build({
        goal,
        pageContext: runtime.pageContext || null,
        profile: runtime.profile || null,
        decisionHistory,
        consecutiveFailures,
        openTabs: runtime.openTabs,
        longTermMemory: runtime.longTermMemory
      });

      // 4. Run Reasoning
      const decision = await ReasoningEngine.reason(contextString, runtime.pageContext);

      // Apply confidence scoring adjustments
      const confidence = ConfidenceScoring.calculate(
        decision.confidence,
        decisionHistory.length,
        consecutiveFailures
      );

      // Validate & Select Tool
      let selectedTool: ActionType;
      try {
        selectedTool = ToolSelector.validateAndSelect(decision.selectedTool, runtime.profile || null);
      } catch (err) {
        const errorText = err instanceof Error ? err.message : "Tool selection failed.";
        context.errors.push(errorText);
        isComplete = true;
        break;
      }

      // Intercept low DOM confidence and override standard tools with vision counterparts
      const domConfidence = evaluateDomConfidence(runtime.pageContext);
      if (domConfidence < DOM_CONFIDENCE_THRESHOLD) {
        if (selectedTool === "click_element") {
          selectedTool = "vision_click";
        } else if (selectedTool === "fill_input") {
          selectedTool = "vision_fill";
        } else if (selectedTool === "fill_form") {
          selectedTool = "vision_fill";
        }
      }

      // Update state with reasoning info
      const stepIndex = steps.length + 1;
      const step: ExecutionStep = {
        step: stepIndex,
        action: selectedTool,
        description: selectedTool.replace(/_/g, " "),
        status: "running",
        attempts: 0
      };
      steps.push(step);

      // Initialize subgoals in goal progress if empty
      if (goalProgress.subGoals.length === 0) {
        goalProgress = GoalTracker.initialize(goal, [selectedTool]);
      } else {
        // Append selected tool as a subgoal dynamically
        goalProgress.subGoals.push({
          id: selectedTool,
          description: selectedTool.replace(/_/g, " "),
          status: "pending"
        });
      }

      goalProgress = GoalTracker.updateProgress(goalProgress, selectedTool, "running");

      onProgress({
        machineState: "EXECUTING",
        currentAgent: ToolRegistry.get(selectedTool).agent,
        currentStep: `Thinking: ${decision.reasoning}`,
        progress: Math.min(95, Math.round((iteration / maxIterations) * 85) + 10),
        reasoning: decision.reasoning,
        selectedTool,
        confidence,
        steps,
        goalProgress
      });

      let success = false;
      let stepError = "";
      let lastDurationMs = 0;
      let currentAttempt = 0;

      // 5. Execute with retry capability
      while (currentAttempt < retryLimit && !success) {
        currentAttempt++;
        const startedAt = performance.now();
        step.attempts = currentAttempt;
        await EventBus.emit("ACTION_STARTED", { action: selectedTool, attempt: currentAttempt });

        try {
          const permission = PermissionGuard.verifyAction(selectedTool, runtime.pageContext);
          if (!permission.allowed) {
            throw new Error(permission.reason || "Permission check failed.");
          }

          if (permission.requiresConfirmation) {
            const confirmMsg = PermissionGuard.createConfirmationMessage(selectedTool);
            onProgress({
              machineState: "WAITING_CONFIRMATION",
              currentStep: confirmMsg
            });

            const approved = await PermissionGuard.awaitConfirmation(selectedTool, confirmMsg);
            if (!approved) {
              throw new Error("Action declined by user.");
            }

            onProgress({
              machineState: "EXECUTING",
              currentStep: `Running: ${selectedTool.replace(/_/g, " ")}...`
            });
          }

          const tool = ToolRegistry.get(selectedTool);
          const result = await tool.handler(runtime, context as any);
          lastDurationMs = Math.round(performance.now() - startedAt);
          context.currentResult = result.result;

          // 6. Observe
          const observation = await ObservationEngine.observe(selectedTool, result.result, runtime.pageContext);
          
          // 7. Reflect
          const reflection = ReflectionEngine.reflect(observation, currentAttempt, retryLimit);

          await AgentMetrics.record(tool.agent, selectedTool, observation.status !== "FAILURE", lastDurationMs);
          await ExecutionLogger.log({
            level: observation.status === "FAILURE" ? "warn" : "info",
            action: selectedTool,
            durationMs: lastDurationMs,
            message: `Action ${selectedTool} observation: ${observation.status}. Reflection: ${reflection.status}`
          });
          await EventBus.emit("ACTION_COMPLETED", { action: selectedTool, durationMs: lastDurationMs });

          if (reflection.status === "success") {
            success = true;
            step.status = "completed";
            consecutiveFailures = 0;
            goalProgress = GoalTracker.updateProgress(goalProgress, selectedTool, "completed");

            decisionHistory.push({
              action: selectedTool,
              reasoning: decision.reasoning,
              confidence,
              observation: `Success: ${observation.status}`,
              status: "completed",
              timestamp: new Date().toISOString()
            });

          } else {
            stepError = reflection.reason || "Action failed to achieve success criteria.";
          }

        } catch (err) {
          lastDurationMs = Math.round(performance.now() - startedAt);
          stepError = err instanceof Error ? err.message : "Execution threw unexpected error.";
          await AgentMetrics.record(ToolRegistry.get(selectedTool).agent, selectedTool, false, lastDurationMs);
          await EventBus.emit("ACTION_FAILED", { action: selectedTool, error: stepError, attempt: currentAttempt });
          await new Promise((resolve) => setTimeout(resolve, 350 * currentAttempt));
        }
      }

      if (!success) {
        step.status = "failed";
        step.error = stepError;
        consecutiveFailures++;
        goalProgress = GoalTracker.updateProgress(goalProgress, selectedTool, "failed", true, stepError);
        
        decisionHistory.push({
          action: selectedTool,
          reasoning: decision.reasoning,
          confidence,
          observation: `Failed: ${stepError}`,
          status: "failed",
          timestamp: new Date().toISOString()
        });

        const report = buildErrorReport(selectedTool, stepError, currentAttempt);
        context.errorReports.push(report);
        context.errors.push(`Step (${selectedTool}) failed: ${stepError}`);
      }

      // 8. Decide on Termination
      if (decision.status === "complete" || consecutiveFailures >= 3) {
        isComplete = true;
      }

      // Update state in local storage to keep UI synced
      await memory.updateAgentState({
        steps,
        goalProgress,
        reasoning: decision.reasoning,
        selectedTool,
        confidence,
        decisionHistory
      });
    }

    const hasErrors = context.errors.length > 0;
    const isSuccess = !hasErrors && consecutiveFailures === 0;

    let finalResult = context.currentResult;
    if (goal.toLowerCase().includes("apply") || goal.toLowerCase().includes("fill")) {
      finalResult = JSON.stringify({
        type: "orchestration_result",
        summary: `Cognitive reasoning agent finalized loop for: "${goal}".`,
        job: context.errors.length === 0 ? context.currentResult : undefined,
        errors: context.errors.length > 0 ? context.errors : undefined,
        errorReports: context.errorReports.length > 0 ? context.errorReports : undefined
      });
    }

    return {
      isActive: false,
      goal,
      currentAgent: "Unknown",
      currentStep: isSuccess ? "All reasoning agent loops completed successfully!" : "Execution finished with errors.",
      progress: 100,
      steps,
      errors: context.errors,
      machineState: isSuccess ? "COMPLETED" : "FAILED",
      finalResult,
      reasoning: decisionHistory[decisionHistory.length - 1]?.reasoning || "Reasoning loop terminated.",
      selectedTool: decisionHistory[decisionHistory.length - 1]?.action || "chat_fallback",
      confidence: decisionHistory[decisionHistory.length - 1]?.confidence || 1.0,
      decisionHistory
    };
  }
};
