import type { PageSnapshot } from "../shared/types/messages";
import type { UserProfile } from "../shared/types/storage";
import { ToolRegistry } from "./toolRegistry";
import type { ActionType } from "../types";
import type { LongTermMemory } from "../types/Memory";

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
  openTabs?: Array<{ title: string; url: string; active: boolean }>;
  longTermMemory?: LongTermMemory | null;
}

export const ContextBuilder = {
  /**
   * Generates a clean, prompt-ready context string.
   */
  build(input: ContextBuilderInput): string {
    const { goal, pageContext, profile, decisionHistory, consecutiveFailures, openTabs, longTermMemory } = input;

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

    // 3. Multi-Tab Intelligence Section
    const tabsSection = openTabs && openTabs.length > 0
      ? `### Open Browser Tabs
${openTabs.map((t, idx) => `- Tab ${idx + 1}: "${t.title}" (URL: "${t.url}"${t.active ? ", active" : ""})`).join("\n")}`
      : `### Open Browser Tabs
- No other browser tabs available.`;

    // 4. User Candidate Profile Section
    const profileSection = profile && (profile.name || profile.email || profile.skills.length > 0)
      ? `### Candidate Profile
- Name: ${profile.name || "Unknown"}
- Skills: ${profile.skills.join(", ") || "None"}
- Experience: ${profile.experience || "None"}`
      : `### Candidate Profile
- Candidate profile is empty/not configured.`;

    // 5. Long-Term Memory Section
    const memorySection = longTermMemory
      ? `### Long-Term Memory & User Preferences
- Preferred Tone: ${longTermMemory.preferredTone || "None"}
- Favorite Technologies: ${(longTermMemory.favoriteTechnologies || []).join(", ") || "None"}
- Target/Favorite Companies: ${(longTermMemory.favoriteCompanies || []).join(", ") || "None"}
- Current Projects: ${(longTermMemory.currentProjects || []).join(", ") || "None"}
- Interview Notes: ${longTermMemory.interviewNotes || "None"}
- Previous Applications Count: ${(longTermMemory.successfulApplications || []).length || 0}
- Saved Jobs Count: ${(longTermMemory.savedJobs || []).length || 0}`
      : `### Long-Term Memory & User Preferences
- Long-term memory is empty.`;

    // 6. Execution / Decision History Section
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

    // 7. Available Tools Section
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
      tabsSection,
      profileSection,
      memorySection,
      historySection,
      toolsSection
    ].join("\n\n");
  }
};
