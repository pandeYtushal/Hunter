import { ToolRegistry } from "./toolRegistry";
import type { ActionType } from "../types";
import type { UserProfile } from "../shared/types/storage";

export const ToolSelector = {
  /**
   * Evaluates the requested tool and returns the registered ActionType.
   * Throws detailed error if the tool is not registered or constraints are not met.
   */
  validateAndSelect(action: string, profile: UserProfile | null): ActionType {
    const matchedTool = ToolRegistry.list().find(
      (t) => t.action.toLowerCase() === action.trim().toLowerCase()
    );

    if (!matchedTool) {
      throw new Error(`Tool "${action}" is not registered in the ToolRegistry.`);
    }

    // Check if tool requires candidate profile and profile is empty/missing
    if (matchedTool.requiresProfile) {
      const hasProfile = profile && (profile.name?.trim() || profile.email?.trim() || profile.skills.length > 0);
      if (!hasProfile) {
        throw new Error(
          `Action "${matchedTool.action}" requires a candidate profile. Please configure profile settings and upload your resume.`
        );
      }
    }

    return matchedTool.action;
  }
};
