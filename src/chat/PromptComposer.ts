import type { ChatContextInfo, ChatMessage } from "./ChatTypes";
import { PromptManager } from "../ai/core/PromptManager";

export const PromptComposer = {
  composeSystemInstruction(context: ChatContextInfo): string {
    const lines = [
      "You are HUNTERR, a highly capable multimodal conversational AI Browser Copilot.",
      "You act as a fusion of ChatGPT, Cursor, and Arc Browser, helping the user search for jobs, prepare applications, and navigate websites.",
      "",
      "### AUTOMATIC BROWSER CONTEXT",
      `- Current URL: ${context.currentUrl || "No active webpage"}`,
    ];

    if (context.pageSnapshot) {
      lines.push(`- Page Title: "${context.pageSnapshot.title || "Unknown"}"`);
      lines.push(`- Page Host: "${context.pageSnapshot.host || "Unknown"}"`);
    }

    if (context.currentGoal) {
      lines.push(`- Active Execution Goal: "${context.currentGoal}"`);
    }
    if (context.currentAgent) {
      lines.push(`- Active Copilot Agent: "${context.currentAgent}"`);
    }

    if (context.longTermMemory) {
      const ltm = context.longTermMemory;
      lines.push("");
      lines.push("### CANDIDATE BROWSER MEMORY");
      if (ltm.favoriteCompanies?.length) {
        lines.push(`- Favorite Companies: ${ltm.favoriteCompanies.join(", ")}`);
      }
      if (ltm.successfulApplications?.length) {
        lines.push(`- Successful Applications: ${ltm.successfulApplications.join(", ")}`);
      }
      if (ltm.savedJobs?.length) {
        lines.push(`- Saved Jobs: ${ltm.savedJobs.join(", ")}`);
      }
      if (ltm.preferredTone) lines.push(`- Preferred Tone: ${ltm.preferredTone}`);
      if (ltm.favoriteTechnologies?.length) {
        lines.push(`- Favorite Technologies: ${ltm.favoriteTechnologies.join(", ")}`);
      }
      if (ltm.currentProjects?.length) {
        lines.push(`- Current Projects: ${ltm.currentProjects.join(", ")}`);
      }
      if (ltm.interviewNotes) lines.push(`- Interview Notes: ${ltm.interviewNotes}`);
    }

    lines.push("");
    lines.push(PromptManager.formatProfileForPrompt(context.profile));

    if (context.browserStateModel) {
      lines.push("");
      lines.push("### BROWSER STATE MODEL");
      lines.push(JSON.stringify(context.browserStateModel, null, 2));
    }

    lines.push("");
    lines.push("### INSTRUCTIONS");
    lines.push("1. When analyzing forms, jobs, or pages, utilize the page context and the FULL candidate profile above.");
    lines.push("2. For autofill, cover letters, match scores, and personalization, detect values only from the saved profile — never invent contact info, employers, degrees, or skills.");
    lines.push("3. If the page context is irrelevant to the query, answer general questions directly like a helpful chatbot.");
    lines.push("4. Keep responses structured, concise, and professional.");

    return lines.join("\n");
  },

  composeUserPrompt(userText: string, context: ChatContextInfo, attachmentsCount: number): string {
    const promptParts = [];

    if (context.selectedText) {
      promptParts.push(`[SELECTED TEXT CONTEXT]\n"${context.selectedText}"\n`);
    }

    if (context.pageSnapshot?.content) {
      const excerpt = context.pageSnapshot.content.slice(0, 2500);
      promptParts.push(`[WEBPAGE DOM EXCERPT]\n${excerpt}\n`);
    }

    if (attachmentsCount > 0) {
      promptParts.push(`[ATTACHMENT INFO] User attached ${attachmentsCount} images/screenshots.\n`);
    }

    promptParts.push(`[USER QUERY]\n${userText}`);

    return promptParts.join("\n");
  }
};
