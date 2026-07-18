import { GoalInterpreter } from "./GoalInterpreter";
import { WorkflowPlanner } from "./WorkflowPlanner";
import { TaskScheduler, type CopilotTask } from "./TaskScheduler";
import { WorkflowExecutor } from "./WorkflowExecutor";
import { WorkflowMonitor } from "./WorkflowMonitor";
import { DecisionEngine } from "./DecisionEngine";
import { ProgressTracker } from "./ProgressTracker";
import { ExecutionTimeline, type TimelineEntry } from "./ExecutionTimeline";
import { storage } from "../shared/storage";
import { memory } from "../ai/memory";
import type { ActionType, ExecutionPlan } from "../shared/types/agent";
import { AIManager } from "../ai/core/AIManager";

export type CopilotMachineState =
  | "idle"
  | "planning"
  | "executing"
  | "paused"
  | "waiting_confirmation"
  | "completed"
  | "failed";

export interface CopilotState {
  machineState: CopilotMachineState;
  currentGoal: string;
  tasks: CopilotTask[];
  progress: number;
  timeline: TimelineEntry[];
  isBlocked: boolean;
  blockReason?: string;
  pendingConfirmationMessage?: string;
  estimatedCompletionTimeSeconds: number;
  lastResult?: string;
}

export class CopilotEngine {
  private static instance: CopilotEngine;

  private state: CopilotState = {
    machineState: "idle",
    currentGoal: "",
    tasks: [],
    progress: 0,
    timeline: [],
    isBlocked: false,
    pendingConfirmationMessage: undefined,
    estimatedCompletionTimeSeconds: 0,
    lastResult: undefined
  };

  private scheduler: TaskScheduler = new TaskScheduler([]);
  private executor = new WorkflowExecutor();
  private monitor = new WorkflowMonitor();
  private tracker = new ProgressTracker();
  private timelineGen = new ExecutionTimeline();

  private executionContext: any = {
    plan: { goal: "", agents: [], actions: [] },
    currentResult: "",
    errors: []
  };

  private listeners: Array<(state: CopilotState) => void> = [];
  
  // Pause/Confirmation resolver functions
  private pauseResolver?: () => void;
  private confirmResolver?: (approved: boolean) => void;

  private constructor() {}

  private async getActiveRuntime(): Promise<any> {
    if (typeof chrome === "undefined" || !chrome.tabs) {
      return { tab: undefined, pageContext: undefined, profile: undefined };
    }
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    let pageContext: any;

    if (tab?.id) {
      const response = await chrome.tabs.sendMessage(tab.id, { type: "GET_PAGE_SNAPSHOT" }).catch(() => undefined);
      pageContext = response?.snapshot;
    }

    const profile = await storage.get("profile").catch(() => null);
    return { tab, pageContext, profile };
  }

  public static getInstance(): CopilotEngine {
    if (!CopilotEngine.instance) {
      CopilotEngine.instance = new CopilotEngine();
    }
    return CopilotEngine.instance;
  }

  getState(): CopilotState {
    return { ...this.state };
  }

  subscribe(listener: (state: CopilotState) => void): () => void {
    this.listeners.push(listener);
    // Broadcast initial state
    listener(this.getState());
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private broadcast(): void {
    const currentState = this.getState();
    this.listeners.forEach((l) => l(currentState));
    
    // Sync to chrome storage to keep standard AgentState overlays updated
    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const activeStep = this.timelineGen.getRunningStep(this.state.tasks);
      const waitingStep = this.timelineGen.getWaitingStep(this.state.tasks);
      
      memory.updateAgentState({
        isActive: this.state.machineState === "executing" || this.state.machineState === "waiting_confirmation",
        goal: this.state.currentGoal,
        currentStep: waitingStep
          ? `Awaiting Confirmation: ${waitingStep.description}`
          : activeStep
          ? `Running: ${activeStep.description}`
          : this.state.machineState === "completed"
          ? "Goal completed successfully!"
          : this.state.machineState === "failed"
          ? `Failed: ${this.state.blockReason}`
          : "Idle",
        progress: this.state.progress
      }).catch(() => null);
    }
  }

  private updateTracker(): void {
    this.tracker.update(this.scheduler.getTasks());
    const block = this.tracker.getBlockState();
    
    this.state.progress = this.tracker.getCompletionPercentage();
    this.state.isBlocked = block.isBlocked;
    this.state.blockReason = block.blockReason;
    this.state.estimatedCompletionTimeSeconds = this.tracker.getEstimatedTimeLeftSeconds();
    this.state.timeline = this.timelineGen.generate(this.scheduler.getTasks());
    this.state.tasks = this.scheduler.getTasks();
  }

  /**
   * Start execution loop for natural language goal prompt
   */
  async startGoal(goalText: string): Promise<void> {
    if (this.state.machineState !== "idle" && this.state.machineState !== "completed" && this.state.machineState !== "failed") {
      throw new Error("CopilotEngine is already active. Stop or cancel current task first.");
    }

    this.state.machineState = "planning";
    this.state.currentGoal = goalText;
    this.executor = new WorkflowExecutor();
    AIManager.getInstance().resetSessionTokens();
    this.broadcast();

    try {
      // 1. Goal Interpreter: free text -> structured plan
      const plan = await GoalInterpreter.interpret(goalText);
      this.executionContext.plan = plan;

      // 2. Workflow Planner: plan -> scheduler tasks
      const tasks = WorkflowPlanner.plan(plan);
      this.scheduler = new TaskScheduler(tasks);
      
      this.state.machineState = "executing";
      this.updateTracker();
      this.broadcast();

      // Start run loop
      void this.runLoop();

    } catch (err: any) {
      this.state.machineState = "failed";
      this.state.isBlocked = true;
      this.state.blockReason = err.message || "Failed during goal planning.";
      this.broadcast();
    }
  }

  private async runLoop(): Promise<void> {
    this.monitor.startTimer();
    let resultText = "";

    while (
      (this.state.machineState === "executing" || this.state.machineState === "paused") &&
      this.scheduler.hasNext()
    ) {
      // Check for pause conditions
      if (this.state.machineState === "paused") {
        await new Promise<void>((resolve) => {
          this.pauseResolver = resolve;
        });
      }

      const task = this.scheduler.getCurrentTask();
      if (!task) break;

      task.status = "running";
      this.updateTracker();
      this.broadcast();

      const attemptLimit = 3;
      let success = false;
      resultText = "";
      let recoveryTask: CopilotTask | undefined;

      while (
        task.attempts < attemptLimit &&
        !success &&
        ((this.state.machineState as string) === "executing" ||
          (this.state.machineState as string) === "waiting_confirmation")
      ) {
        task.attempts++;
        const startedAt = performance.now();

        const outcome = await this.executor.execute(
          task,
          this.executionContext,
          (msg, onConfirm, onSkip) => {
            // Confirmation Handler Gate
            this.state.machineState = "waiting_confirmation";
            this.state.pendingConfirmationMessage = msg;
            this.broadcast();

            this.confirmResolver = (approved) => {
              this.state.machineState = "executing";
              this.state.pendingConfirmationMessage = undefined;
              this.broadcast();
              if (approved) {
                onConfirm();
              } else {
                onSkip();
              }
            };
          }
        );

        const durationMs = Math.round(performance.now() - startedAt);
        resultText = outcome.result;
        recoveryTask = outcome.recoveryTask;

        // Wait a short moment for page animations/transitions to settle
        await new Promise((resolve) => setTimeout(resolve, 1000));

        // Fetch fresh post-action runtime details to observe resulting page state
        const postRuntime = await this.getActiveRuntime();

        // Decision Engine check
        const evaluation = await DecisionEngine.evaluate(
          task.action,
          resultText,
          postRuntime.pageContext,
          task.attempts,
          attemptLimit
        );

        if (evaluation.decision === "continue") {
          success = true;
          task.status = "completed";
          this.scheduler.completeTask(task.id);
          
          await this.monitor.recordStep(
            "Unknown", // derived
            task.action,
            true,
            durationMs,
            `Task completed: ${task.name}. Output: ${resultText}`
          );
        } else if (evaluation.decision === "retry") {
          console.log(`Retrying step "${task.name}" due to: ${evaluation.reason}`);
        } else {
          // Failure or Replan outcome
          break;
        }
      }

      if (!success) {
        if (this.state.machineState !== "executing") {
          // If the loop was paused, cancelled, or is waiting confirmation, do not fail
          this.updateTracker();
          this.broadcast();
          continue;
        }

        task.status = "failed";
        task.error = resultText;
        
        // If recovery coordinates click/fill exist, inject them dynamically
        if (recoveryTask) {
          console.log(`Injecting recovery visual task: ${recoveryTask.name}`);
          this.scheduler.injectTask(recoveryTask);
        } else {
          // Terminal failure
          this.scheduler.failTask(task.id, resultText);
          this.state.machineState = "failed";
          this.state.lastResult = resultText;
          this.updateTracker();
          this.broadcast();
          return;
        }
      }

      this.updateTracker();
      this.broadcast();
    }

    if (this.state.machineState === "executing") {
      this.state.machineState = "completed";
      this.state.lastResult = resultText;
      this.monitor.stopTimer();
      this.updateTracker();
      this.broadcast();
    }
  }

  pause(): void {
    if (this.state.machineState === "executing") {
      this.state.machineState = "paused";
      this.broadcast();
    }
  }

  resume(): void {
    if (this.state.machineState === "paused") {
      this.state.machineState = "executing";
      this.broadcast();
      if (this.pauseResolver) {
        this.pauseResolver();
        this.pauseResolver = undefined;
      }
    }
  }

  cancel(): void {
    this.state.machineState = "idle";
    this.state.lastResult = undefined;
    this.state.pendingConfirmationMessage = undefined;
    this.scheduler = new TaskScheduler([]);
    this.updateTracker();
    this.broadcast();
  }

  approve(): void {
    if (this.state.machineState === "waiting_confirmation" && this.confirmResolver) {
      this.confirmResolver(true);
      this.confirmResolver = undefined;
    }
  }

  skip(): void {
    if (this.state.machineState === "waiting_confirmation" && this.confirmResolver) {
      this.confirmResolver(false);
      this.confirmResolver = undefined;
    } else {
      const activeTask = this.scheduler.getCurrentTask();
      if (activeTask) {
        this.scheduler.skipTask(activeTask.id);
        this.updateTracker();
        this.broadcast();
      }
    }
  }

  retry(): void {
    const activeTask = this.scheduler.getCurrentTask() || this.scheduler.getTasks().find((t) => t.status === "failed");
    if (activeTask) {
      this.scheduler.retryTask(activeTask.id);
      this.state.machineState = "executing";
      this.updateTracker();
      this.broadcast();
      void this.runLoop();
    }
  }
}
export default CopilotEngine;
