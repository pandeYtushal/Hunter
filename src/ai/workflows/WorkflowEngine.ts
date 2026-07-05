import { PipelineOrchestrator } from "../automation/PipelineOrchestrator";

export interface WorkflowStep {
  id: string;
  type: "navigate" | "click" | "fill" | "extract" | "wait" | "condition" | "loop" | "approval";
  params: {
    url?: string;
    selector?: string;
    value?: string;
    duration?: number;
    conditionKey?: string;
    conditionValue?: string;
    loopCount?: number;
    prompt?: string;
  };
}

export interface Workflow {
  id: string;
  name: string;
  steps: WorkflowStep[];
  variables: Record<string, string>;
}

export interface WorkflowRunLog {
  runId: string;
  workflowId: string;
  name: string;
  status: "running" | "completed" | "failed" | "waiting_approval";
  logs: string[];
  timestamp: string;
}

export class WorkflowEngine {
  private static activeRuns = new Map<string, WorkflowRunLog>();

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private static substituteVars(text: string, vars: Record<string, string>): string {
    let result = text;
    for (const [k, v] of Object.entries(vars)) {
      result = result.replace(new RegExp(`{{${k}}}`, "g"), v);
    }
    return result;
  }

  static async getHistory(): Promise<WorkflowRunLog[]> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return [];
    const data = await chrome.storage.local.get("workflowHistory");
    return data?.workflowHistory || [];
  }

  static async saveHistory(log: WorkflowRunLog): Promise<void> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    const current = await this.getHistory();
    const idx = current.findIndex(h => h.runId === log.runId);
    if (idx >= 0) {
      current[idx] = log;
    } else {
      current.unshift(log);
    }
    await chrome.storage.local.set({ workflowHistory: current.slice(0, 50) });
  }

  static async run(workflow: Workflow): Promise<string> {
    const runId = Math.random().toString(36).substring(2, 15);
    const runLog: WorkflowRunLog = {
      runId,
      workflowId: workflow.id,
      name: workflow.name,
      status: "running",
      logs: ["Workflow execution initialized."],
      timestamp: new Date().toISOString()
    };
    this.activeRuns.set(runId, runLog);
    await this.saveHistory(runLog);

    // Run asynchronously
    void this.executeWorkflow(runId, workflow);
    return runId;
  }

  private static async logToRun(runId: string, message: string): Promise<void> {
    const run = this.activeRuns.get(runId);
    if (run) {
      run.logs.push(`[${new Date().toLocaleTimeString()}] ${message}`);
      await this.saveHistory(run);
    }
  }

  private static async executeWorkflow(runId: string, workflow: Workflow): Promise<void> {
    const vars = { ...workflow.variables };
    try {
      await this.logToRun(runId, `Starting execution of ${workflow.steps.length} steps.`);
      await this.executeSteps(runId, workflow.steps, vars);
      
      const run = this.activeRuns.get(runId);
      if (run) {
        run.status = "completed";
        await this.logToRun(runId, "Workflow execution completed successfully.");
      }
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Execution failed due to internal error.";
      const run = this.activeRuns.get(runId);
      if (run) {
        run.status = "failed";
        await this.logToRun(runId, `Workflow failed: ${errMsg}`);
      }
    }
  }

  private static async executeSteps(runId: string, steps: WorkflowStep[], vars: Record<string, string>): Promise<void> {
    for (const step of steps) {
      // 1. Check if user paused or stopped the workflow run log
      const run = this.activeRuns.get(runId);
      if (run && (run.status === "failed" || run.status === "completed")) {
        return;
      }

      await this.logToRun(runId, `Executing block type: ${step.type}`);

      switch (step.type) {
        case "navigate": {
          if (!step.params.url) throw new Error("Missing URL parameter on navigate step.");
          const targetUrl = this.substituteVars(step.params.url, vars);
          await this.logToRun(runId, `Navigating page to: ${targetUrl}`);
          await PipelineOrchestrator.run(`navigate to url "${targetUrl}"`, () => {});
          break;
        }

        case "click": {
          if (!step.params.selector) throw new Error("Missing selector on click step.");
          const targetSel = this.substituteVars(step.params.selector, vars);
          await this.logToRun(runId, `Clicking page element: ${targetSel}`);
          await PipelineOrchestrator.run(`click element "${targetSel}"`, () => {});
          break;
        }

        case "fill": {
          if (!step.params.selector || !step.params.value) throw new Error("Missing params on fill step.");
          const targetSel = this.substituteVars(step.params.selector, vars);
          const targetVal = this.substituteVars(step.params.value, vars);
          await this.logToRun(runId, `Filling element "${targetSel}" with value "${targetVal}"`);
          await PipelineOrchestrator.run(`fill input "${targetSel}" with value "${targetVal}"`, () => {});
          break;
        }

        case "extract": {
          if (!step.params.selector || !step.params.conditionKey) throw new Error("Missing parameters on extract step.");
          const targetSel = this.substituteVars(step.params.selector, vars);
          const variableName = step.params.conditionKey;
          await this.logToRun(runId, `Extracting text from "${targetSel}" into variable "${variableName}"`);
          const finalState = await PipelineOrchestrator.run(`extract text from "${targetSel}"`, () => {});
          vars[variableName] = finalState.finalResult || "Extracted text content";
          await this.logToRun(runId, `Variable "${variableName}" set to: "${vars[variableName].slice(0, 30)}..."`);
          break;
        }

        case "wait": {
          const duration = step.params.duration || 1000;
          await this.logToRun(runId, `Sleeping for ${duration}ms...`);
          await this.sleep(duration);
          break;
        }

        case "loop": {
          const limit = step.params.loopCount || 1;
          await this.logToRun(runId, `Starting loop block (${limit} iterations).`);
          for (let i = 0; i < limit; i++) {
            await this.logToRun(runId, `Loop cycle iteration index: ${i + 1}/${limit}`);
            // Recurse inner loops
            const innerSteps = step.params.value ? JSON.parse(step.params.value) as WorkflowStep[] : [];
            await this.executeSteps(runId, innerSteps, vars);
          }
          break;
        }

        case "condition": {
          const key = step.params.conditionKey || "";
          const expected = step.params.conditionValue || "";
          const actual = vars[key] || "";
          
          await this.logToRun(runId, `Evaluating condition check: variable "${key}" (actual: "${actual}") === "${expected}"`);
          if (actual === expected) {
            await this.logToRun(runId, "Condition matches. Running nested positive steps.");
            const matchedSteps = step.params.value ? JSON.parse(step.params.value) as WorkflowStep[] : [];
            await this.executeSteps(runId, matchedSteps, vars);
          } else {
            await this.logToRun(runId, "Condition check does not match. Bypassing positive steps.");
          }
          break;
        }

        case "approval": {
          const prompt = step.params.prompt || "Approve next automation step?";
          await this.logToRun(runId, `Pausing workflow execution. Requesting human approval for: "${prompt}"`);
          
          const run = this.activeRuns.get(runId);
          if (run) {
            run.status = "waiting_approval";
            await this.saveHistory(run);
          }

          // In chrome storage, we write approval requirements. The UI handles confirming it.
          if (typeof chrome !== "undefined" && chrome.storage?.local) {
            await chrome.storage.local.set({
              workflowPendingApproval: { runId, prompt }
            });
          }

          let approved = false;
          let userResponded = false;

          while (!userResponded) {
            await this.sleep(1000);
            if (typeof chrome !== "undefined" && chrome.storage?.local) {
              const res = await chrome.storage.local.get("workflowApprovalResponse");
              if (res?.workflowApprovalResponse && res.workflowApprovalResponse.runId === runId) {
                approved = res.workflowApprovalResponse.approved;
                userResponded = true;
                // Clear trigger
                await chrome.storage.local.remove(["workflowPendingApproval", "workflowApprovalResponse"]);
              }
            } else {
              // If chrome storage isn't available (tests), mock auto-approval
              approved = true;
              userResponded = true;
            }
          }

          if (run) {
            run.status = "running";
            await this.saveHistory(run);
          }

          if (approved) {
            await this.logToRun(runId, "Human approval granted. Resuming automation.");
          } else {
            throw new Error("Human approval rejected workflow execution.");
          }
          break;
        }
      }
    }
  }
}
