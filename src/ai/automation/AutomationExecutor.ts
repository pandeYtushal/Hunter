import { ToolRegistry } from "../toolRegistry";
import { PermissionGuard } from "../../security/PermissionGuard";
import type { ActionType } from "../../types/Action";
import type { ExecutionContext } from "../../types/Execution";
import type { PageSnapshot } from "../../shared/types/messages";
import type { UserProfile } from "../../shared/types/storage";

export interface ExecutionRuntime {
  tab?: chrome.tabs.Tab;
  pageContext?: PageSnapshot;
  profile?: UserProfile;
}

export class AutomationExecutor {
  static async execute(
    action: ActionType,
    runtime: ExecutionRuntime,
    context: ExecutionContext,
    onProgress: (msg: string, state?: string) => void
  ): Promise<{ success: boolean; result: string; error?: string }> {
    
    // 1. Verify domain and action permission bounds
    const permission = PermissionGuard.verifyAction(action, runtime.pageContext);
    if (!permission.allowed) {
      return { success: false, result: "", error: permission.reason || "Permission check failed." };
    }

    // 2. Solicit user confirmation before dangerous triggers
    if (permission.requiresConfirmation) {
      const confirmMsg = PermissionGuard.createConfirmationMessage(action);
      onProgress(confirmMsg, "WAITING_CONFIRMATION");

      const approved = await PermissionGuard.awaitConfirmation(action, confirmMsg);
      if (!approved) {
        return { success: false, result: "", error: "Action declined by user." };
      }

      onProgress(`Running: ${action.replace(/_/g, " ")}...`, "EXECUTING");
    }

    // 3. Pre-execution modal & alert dismissal check
    if (runtime.tab?.id) {
      try {
        await chrome.tabs.sendMessage(runtime.tab.id, { type: "HANDLE_MODAL" }).catch(() => null);
      } catch (err) {
        console.warn("Pre-action modal dismissal check failed:", err);
      }
    }

    // 4. Invoke tool registry handler
    try {
      const tool = ToolRegistry.get(action);
      const output = await tool.handler(runtime, context);
      
      // 5. Post-execution modal & alert cleanup check
      if (runtime.tab?.id) {
        try {
          await chrome.tabs.sendMessage(runtime.tab.id, { type: "HANDLE_MODAL" }).catch(() => null);
        } catch (err) {
          console.warn("Post-action modal dismissal check failed:", err);
        }
      }

      return { success: true, result: output.result };
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Action execution failed.";
      return { success: false, result: "", error: errMsg };
    }
  }
}
