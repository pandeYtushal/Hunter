import type { ActionType } from "../types/Action";
import type { PageSnapshot } from "../shared/types/messages";

const restrictedSchemes = ["chrome:", "chrome-extension:", "edge:", "about:", "file:"];
const sensitiveActions = new Set<ActionType>(["upload_resume", "fill_form", "navigate_page", "vision_click", "vision_fill", "vision_analyze"]);

export interface PermissionCheck {
  allowed: boolean;
  reason?: string;
  requiresConfirmation: boolean;
}

export const PermissionGuard = {
  verifyDomainAccess(pageContext?: PageSnapshot): PermissionCheck {
    if (!pageContext?.url) {
      return { allowed: false, reason: "No active page context is available.", requiresConfirmation: false };
    }

    try {
      const url = new URL(pageContext.url);
      if (restrictedSchemes.includes(url.protocol)) {
        return {
          allowed: false,
          reason: `Hunter cannot automate restricted ${url.protocol} pages.`,
          requiresConfirmation: false
        };
      }
      return { allowed: true, requiresConfirmation: false };
    } catch {
      return { allowed: false, reason: "The active page URL is invalid.", requiresConfirmation: false };
    }
  },

  verifyAction(action: ActionType, pageContext?: PageSnapshot): PermissionCheck {
    const domainCheck = PermissionGuard.verifyDomainAccess(pageContext);
    if (!domainCheck.allowed) return domainCheck;

    return {
      allowed: true,
      requiresConfirmation: sensitiveActions.has(action)
    };
  },

  createConfirmationMessage(action: ActionType): string {
    switch (action) {
      case "upload_resume":
        return "Resume upload requires your manual confirmation before any file picker action.";
      case "navigate_page":
        return "External navigation requires confirmation before moving away from the current page.";
      case "fill_form":
        return "Form fill proposals require confirmation before values are written.";
      case "vision_click":
        return "Vision Click: Hunter detected this button via image analysis and will click it upon confirmation.";
      case "vision_fill":
        return "Vision Fill: Hunter will input details into this field located via visual layout matching.";
      case "vision_analyze":
        return "Vision Scan: Hunter will capture a screenshot and analyze page visual components.";
      default:
        return "This action is ready to run.";
    }
  }
};
