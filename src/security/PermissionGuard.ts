import type { ActionType } from "../types/Action";
import type { PageSnapshot } from "../shared/types/messages";

const restrictedSchemes = ["chrome:", "chrome-extension:", "edge:", "about:", "file:"];

export type PermissionLevel = "SAFE" | "MEDIUM" | "HIGH";

const mediumActions = new Set<ActionType>(["fill_form", "fill_input", "upload_resume", "vision_fill", "handle_dynamic_form"]);
const highActions = new Set<ActionType>(["click_element", "vision_click"]);

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  requiresConfirmation: boolean;
  level: PermissionLevel;
}

const highRiskText = /\b(submit|send|delete|remove|purchase|pay|buy|post|publish|confirm order|place order|apply now|final submit)\b/i;
const mediumRiskText = /\b(edit|fill|autofill|upload|attach|type|write|replace)\b/i;

export const PermissionGuard = {
  verifyDomainAccess(pageContext?: PageSnapshot): PermissionCheck {
    if (!pageContext?.url) {
      return { allowed: false, reason: "No active page context is available.", requiresConfirmation: false, level: "SAFE" };
    }

    try {
      const url = new URL(pageContext.url);
      if (restrictedSchemes.includes(url.protocol)) {
        return {
          allowed: false,
          reason: `Hunter cannot automate restricted ${url.protocol} pages.`,
          requiresConfirmation: false,
          level: "SAFE"
        };
      }
      return { allowed: true, requiresConfirmation: false, level: "SAFE" };
    } catch {
      return { allowed: false, reason: "The active page URL is invalid.", requiresConfirmation: false, level: "SAFE" };
    }
  },

  classifyAction(action: ActionType, taskText = ""): PermissionLevel {
    if (highActions.has(action) && highRiskText.test(taskText)) return "HIGH";
    if (highRiskText.test(taskText)) return "HIGH";
    if (mediumActions.has(action) || mediumRiskText.test(taskText)) return "MEDIUM";
    return "SAFE";
  },

  verifyAction(action: ActionType, pageContext?: PageSnapshot, taskText = "", mediumApproved = false): PermissionCheck {
    const domainCheck = PermissionGuard.verifyDomainAccess(pageContext);
    if (!domainCheck.allowed) return domainCheck;

    const level = PermissionGuard.classifyAction(action, taskText);
    const requiresConfirmation = level === "HIGH" || (level === "MEDIUM" && !mediumApproved);

    return {
      allowed: true,
      requiresConfirmation,
      level
    };
  },

  createConfirmationMessage(action: ActionType, level: PermissionLevel = PermissionGuard.classifyAction(action), taskName?: string): string {
    if (level === "HIGH") {
      return `Hunter is paused before a high-impact action${taskName ? `: ${taskName}` : ""}. Review and approve before it submits, sends, deletes, purchases, or posts anything.`;
    }

    if (level === "MEDIUM") {
      return `Hunter needs one-time approval to edit page content${taskName ? ` for: ${taskName}` : ""}. This covers filling fields, uploads, and autofill during the current task.`;
    }

    return "This safe browsing action can run automatically.";
  },

  async awaitConfirmation(action: ActionType, message: string): Promise<boolean> {
    if (typeof chrome === "undefined" || !chrome.storage || !chrome.storage.local) {
      return true; // Auto-approve in non-extension environments
    }

    await chrome.storage.local.set({
      approvalState: {
        action,
        message,
        status: "pending"
      }
    });

    return new Promise<boolean>((resolve) => {
      const checkInterval = setInterval(async () => {
        // Check if agent loop is cancelled/stopped
        const currentState = await chrome.storage.local.get("agentState");
        if (currentState?.agentState && !currentState.agentState.isActive) {
          clearInterval(checkInterval);
          await chrome.storage.local.remove("approvalState");
          resolve(false);
          return;
        }

        const approval = await chrome.storage.local.get("approvalState");
        if (approval?.approvalState?.status === "approved") {
          clearInterval(checkInterval);
          await chrome.storage.local.remove("approvalState");
          resolve(true);
        } else if (approval?.approvalState?.status === "declined") {
          clearInterval(checkInterval);
          await chrome.storage.local.remove("approvalState");
          resolve(false);
        }
      }, 200);
    });
  }
};
