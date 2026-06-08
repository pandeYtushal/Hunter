import type { PageSnapshot } from "../shared/types/messages";
import type { UserProfile } from "../shared/types/storage";
import { ToolRegistry } from "./toolRegistry";
import type { ActionType } from "../types";

export interface DecisionLogEntry {
  action: ActionType;
  reasoning: string;
  confidence: number;
  observation: string;
  status: "completed" | "failed";
  timestamp: string;
}

export interface ContextBuilderInput {
  goal: string;
  pageContext: PageSnapshot | null;
  profile: UserProfile | null;
  decisionHistory: DecisionLogEntry[];
  consecutiveFailures: number;
}

export const ContextBuilder = {
  /**
   * Generates a clean, prompt-ready context string.
   */
  build(input: ContextBuilderInput): string {
    const { goal, pageContext, profile, decisionHistory, consecutiveFailures } = input;

    // 1. Goal Section
    const goalSection = `### Current Goal
- Goal: "${goal}"
- Consecutive Step Failures: ${consecutiveFailures}`;

    // 2. Active Webpage Section
    const pageSection = pageContext
      ? `### Active Webpage Context
- Title: "${pageContext.title || "Unknown"}"
- URL: "${pageContext.url || "Unknown"}"
- Excerpt: "${(pageContext.content || "").slice(0, 1500)}"
- Selection/Meta: "${pageContext.selectedText || pageContext.description || "None"}"`
      : `### Active Webpage Context
- No active webpage details captured.`;

    // 3. User Candidate Profile Section
    const profileSection = profile && (profile.name || profile.email || profile.skills.length > 0)
      ? `### Candidate Profile
- Name: ${profile.name || "Unknown"}
- Skills: ${profile.skills.join(", ") || "None"}
- Experience: ${profile.experience || "None"}`
      : `### Candidate Profile
- Candidate profile is empty/not configured.`;

    // 4. Execution / Decision History Section
    const historyLines = decisionHistory.map((d, index) => {
      return `Step ${index + 1}:
- Action Selected: ${d.action}
- Reasoning: ${d.reasoning}
- Confidence: ${d.confidence}
- Observation: ${d.observation}
- Status: ${d.status}`;
    });

    const historySection = `### Execution History
${historyLines.length > 0 ? historyLines.join("\n\n") : "No actions have been executed yet."}`;

    // 5. Available Tools Section
    const tools = ToolRegistry.list();
    const toolLines = tools.map((t) => {
      return `- "${t.action}": ${t.description} (Requires Resume/Profile: ${t.requiresProfile})`;
    });

    const toolsSection = `### Available Tools
${toolLines.join("\n")}`;

    // Combine sections
    return [
      goalSection,
      pageSection,
      profileSection,
      historySection,
      toolsSection
    ].join("\n\n");
  }
};
