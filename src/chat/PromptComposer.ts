import type { ChatContextInfo, ChatMessage } from "./ChatTypes";

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
    }

    if (context.profile) {
      const p = context.profile;
      lines.push("");
      lines.push("### CANDIDATE PROFILE & RESUME DATA");
      if (p.name) lines.push(`- Name: ${p.name}`);
      if (p.email) lines.push(`- Email: ${p.email}`);
      if (p.phone) lines.push(`- Phone: ${p.phone}`);
      if (p.linkedIn) lines.push(`- LinkedIn: ${p.linkedIn}`);
      if (p.portfolio) lines.push(`- Portfolio: ${p.portfolio}`);
      if (p.skills && p.skills.length > 0) {
        lines.push(`- Skills: ${p.skills.join(", ")}`);
      }
      if (p.experience) {
        lines.push(`- Work Experience & Education Summary:\n${p.experience}`);
      }
      if (p.resumeFileName) {
        lines.push(`- Resume Source File: ${p.resumeFileName}`);
      }
    }

    lines.push("");
    lines.push("### INSTRUCTIONS");
    lines.push("1. When analyzing forms, jobs, or pages, utilize the page context variables below.");
    lines.push("2. If the page context is irrelevant to the query, answer general questions directly like a helpful chatbot.");
    lines.push("3. Keep responses structured, concise, and professional.");

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
