import { ToolRegistry } from "../ai/toolRegistry";
import { PermissionGuard } from "../security/PermissionGuard";
import { RecoveryEngine } from "./RecoveryEngine";
import { storage } from "../shared/storage";
import type { CopilotTask } from "./TaskScheduler";
import type { ActionType } from "../shared/types/agent";

export class WorkflowExecutor {
  private currentTabId?: number;
  private mediumApprovalGranted = false;

  /**
   * Find tab matching URL substring.
   */
  private async findTabByUrl(substring: string): Promise<chrome.tabs.Tab | null> {
    if (typeof chrome === "undefined" || !chrome.tabs) return null;
    return new Promise((resolve) => {
      chrome.tabs.query({}, (tabs) => {
        const matched = tabs.find((t) => t.url && t.url.toLowerCase().includes(substring.toLowerCase()));
        resolve(matched || null);
      });
    });
  }

  /**
   * Switch tabs intelligently based on action type.
   */
  private async switchTabIntelligently(action: ActionType): Promise<void> {
    if (typeof chrome === "undefined" || !chrome.tabs) return;

    let targetTab: chrome.tabs.Tab | null = null;
    if (action === "match_resume" || action === "parse_resume") {
      targetTab = await this.findTabByUrl("resume") || await this.findTabByUrl("profile");
    } else if (action === "research_company") {
      targetTab = await this.findTabByUrl("company") || await this.findTabByUrl("google") || await this.findTabByUrl("linkedin");
    }

    if (targetTab && targetTab.id) {
      console.log(`Intelligently switching active tab to ${targetTab.url} for action ${action}`);
      await chrome.tabs.update(targetTab.id, { active: true });
      this.currentTabId = targetTab.id;
    }
  }

  private async waitForRenderedPage(tabId: number): Promise<void> {
    try {
      await chrome.tabs.sendMessage(tabId, { type: "WAIT_FOR_PAGE_READY" });
    } catch {
      // Restricted pages and pages without a content script are handled by the snapshot fallback below.
    }
  }

  /**
   * Execute the given task.
   */
  async execute(
    task: CopilotTask,
    executionContext: any,
    onConfirmationRequired: (msg: string, onConfirm: () => void, onSkip: () => void) => void
  ): Promise<{ success: boolean; result: string; recoveryTask?: CopilotTask }> {
    
    // 1. Switch tabs intelligently if necessary
    await this.switchTabIntelligently(task.action);

    // 2. Fetch runtime context details
    if (typeof chrome === "undefined" || !chrome.tabs) {
      return { success: true, result: "Mock execution succeeded." };
    }

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || !activeTab.id) {
      return { success: false, result: "No active browser tab found." };
    }

    this.currentTabId = activeTab.id;
    await this.waitForRenderedPage(activeTab.id);

    let pageContext = null;
    try {
      const response = await chrome.tabs.sendMessage(activeTab.id, { type: "GET_PAGE_SNAPSHOT" });
      pageContext = response?.snapshot;
    } catch {
      // Content script not loaded or restricted page
    }

    const profile = await storage.get("profile").catch(() => null);

    const runtime = {
      tab: activeTab,
      pageContext,
      profile
    };

    // 3. Safety Permission Checks
    const taskText = `${task.name} ${task.description || ""}`;
    const guard = PermissionGuard.verifyAction(task.action, pageContext, taskText, this.mediumApprovalGranted);
    if (!guard.allowed) {
      return { success: false, result: guard.reason || "This page cannot be automated." };
    }

    if (guard.requiresConfirmation) {
      task.status = "waiting_confirmation";
      const confirmMsg = PermissionGuard.createConfirmationMessage(task.action, guard.level, task.name);
      
      return new Promise((resolve) => {
        onConfirmationRequired(
          confirmMsg,
          async () => {
            // User Approved: execute
            if (guard.level === "MEDIUM") {
              this.mediumApprovalGranted = true;
            }
            task.status = "running";
            const outcome = await this.runTool(task, runtime, executionContext);
            resolve(outcome);
          },
          () => {
            // User Skipped
            task.status = "skipped";
            resolve({ success: true, result: "Skipped by user." });
          }
        );
      });
    }

    task.status = "running";
    return await this.runTool(task, runtime, executionContext);
  }

  private async runTool(
    task: CopilotTask,
    runtime: any,
    executionContext: any
  ): Promise<{ success: boolean; result: string; recoveryTask?: CopilotTask }> {
    try {
      const tool = ToolRegistry.get(task.action);
      const res = await tool.handler(runtime, executionContext);
      
      return {
        success: true,
        result: res.result
      };
    } catch (err: any) {
      console.warn(`Tool execution failed for action ${task.action}: ${err.message}`);
      
      // Call Recovery Engine to determine self healing visual path
      let recovery: CopilotTask | undefined;
      if (this.currentTabId) {
        const healing = await RecoveryEngine.determineRecovery(task, err.message, this.currentTabId).catch(() => null);
        if (healing) recovery = healing;
      }

      return {
        success: false,
        result: err.message,
        recoveryTask: recovery
      };
    }
  }
}
