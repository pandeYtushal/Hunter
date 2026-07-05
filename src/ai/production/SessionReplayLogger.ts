export interface ReplayStep {
  action: string;
  durationMs: number;
  confidence: number;
  status: "success" | "failed";
  timestamp: string;
}

export interface SessionReplay {
  sessionId: string;
  goal: string;
  steps: ReplayStep[];
  timestamp: string;
}

export class SessionReplayLogger {
  private static activeSteps: ReplayStep[] = [];

  static clearActiveSession(): void {
    this.activeSteps = [];
  }

  static recordStep(action: string, durationMs: number, confidence: number, status: "success" | "failed"): void {
    this.activeSteps.push({
      action,
      durationMs,
      confidence,
      status,
      timestamp: new Date().toISOString()
    });
  }

  static async finalizeSession(goal: string): Promise<string> {
    const sessionId = Math.random().toString(36).substring(2, 15);
    const newReplay: SessionReplay = {
      sessionId,
      goal,
      steps: [...this.activeSteps],
      timestamp: new Date().toISOString()
    };

    if (typeof chrome !== "undefined" && chrome.storage?.local) {
      const data = await chrome.storage.local.get("sessionReplays");
      const list = data?.sessionReplays || [];
      list.unshift(newReplay);
      // Keep last 10 session replays
      await chrome.storage.local.set({ sessionReplays: list.slice(0, 10) });
    }

    this.clearActiveSession();
    return sessionId;
  }

  static async getReplays(): Promise<SessionReplay[]> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return [];
    const data = await chrome.storage.local.get("sessionReplays");
    return data?.sessionReplays || [];
  }
}
