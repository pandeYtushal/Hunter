import { AIManager } from "../core/AIManager";
import { ConcurrentScheduler } from "./ConcurrentScheduler";

export class SupervisorAgent {
  /**
   * Evaluates user prompt, splits compound queries into discrete sub-goals, and adds them to scheduler.
   */
  static async analyzeAndSchedule(instruction: string): Promise<string[]> {
    let goals = [instruction];
    
    try {
      const response = await AIManager.getInstance().chat({
        prompt: `You are the Hunter Supervisor Agent. Analyze this user instruction: "${instruction}"
Split this instruction into separate, discrete browser goals that can execute concurrently (e.g., "Research company details", "Scan job form layout", "Download invoice document").
Return a JSON array of goal strings. If the instruction represents only one task, return an array with that single task string.
Output only the JSON list of goals. Example format: ["goal 1", "goal 2"]`,
        history: []
      });

      const cleanText = response.text.trim().replace(/```json/g, "").replace(/```/g, "").trim();
      const parsed = JSON.parse(cleanText);
      if (Array.isArray(parsed) && parsed.length > 0) {
        goals = parsed;
      }
    } catch (e) {
      console.warn("SupervisorAgent failed to split instruction, scheduling as single goal:", e);
    }

    const taskIds: string[] = [];
    for (const goal of goals) {
      const goalLower = goal.toLowerCase();
      const priority = goalLower.includes("apply") || goalLower.includes("download") || goalLower.includes("fill") ? "high" : "medium";
      const id = await ConcurrentScheduler.addTask(goal, priority);
      taskIds.push(id);
    }

    return taskIds;
  }
}
