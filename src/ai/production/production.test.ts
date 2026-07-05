import { describe, expect, it, vi, beforeEach } from "vitest";
import { PlaywrightExporter, type PlaywrightAction } from "./PlaywrightExporter";
import { SessionReplayLogger } from "./SessionReplayLogger";

// Mock global chrome storage
const storageStore: Record<string, any> = {};
global.chrome = {
  storage: {
    local: {
      get: vi.fn().mockImplementation(async (keys) => {
        if (typeof keys === "string") {
          return { [keys]: storageStore[keys] };
        }
        const result: Record<string, any> = {};
        for (const k of keys) {
          result[k] = storageStore[k];
        }
        return result;
      }),
      set: vi.fn().mockImplementation(async (obj) => {
        for (const [k, v] of Object.entries(obj)) {
          storageStore[k] = v;
        }
      })
    }
  }
} as any;

describe("PlaywrightExporter Service", () => {
  it("translates navigate, click, fill steps into correct Playwright code structures", () => {
    const actions: PlaywrightAction[] = [
      { type: "navigate", url: "https://gmail.com" },
      { type: "click", selector: "button.submit" },
      { type: "fill", selector: "input#user", value: "Tushal" }
    ];

    const script = PlaywrightExporter.exportToScript(actions);
    expect(script).toContain("import { test, expect } from '@playwright/test';");
    expect(script).toContain("await page.goto('https://gmail.com');");
    expect(script).toContain("await page.locator('button.submit').click();");
    expect(script).toContain("await page.locator('input#user').fill('Tushal');");
  });
});

describe("SessionReplayLogger Telemetry", () => {
  beforeEach(() => {
    storageStore.sessionReplays = [];
    SessionReplayLogger.clearActiveSession();
  });

  it("logs step properties and writes session replay to storage", async () => {
    SessionReplayLogger.recordStep("navigate_page", 250, 0.95, "success");
    SessionReplayLogger.recordStep("click_element", 180, 0.88, "success");

    const sessionId = await SessionReplayLogger.finalizeSession("Search jobs");
    expect(sessionId).toBeDefined();

    const list = await SessionReplayLogger.getReplays();
    expect(list.length).toBe(1);
    expect(list[0].goal).toBe("Search jobs");
    expect(list[0].steps.length).toBe(2);
    expect(list[0].steps[0].action).toBe("navigate_page");
  });
});
