import { describe, expect, it, vi, beforeEach } from "vitest";
import { LocalSemanticSearch } from "./LocalSemanticSearch";
import { WorkingMemory } from "./WorkingMemory";
import { SessionMemory } from "./SessionMemory";
import { LongTermMemoryService } from "./LongTermMemoryService";
import { ContextRetrieval } from "./ContextRetrieval";

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
      }),
      remove: vi.fn().mockImplementation(async (key) => {
        delete storageStore[key];
      })
    }
  }
} as any;

describe("LocalSemanticSearch", () => {
  it("filters out stop words and tokenizes correctly", () => {
    const tokens = LocalSemanticSearch.tokenize("The Software Engineer job at Google");
    expect(tokens).toContain("software");
    expect(tokens).toContain("engineer");
    expect(tokens).toContain("google");
    expect(tokens).not.toContain("the");
    expect(tokens).not.toContain("at");
  });

  it("calculates similarity scores correctly", () => {
    const scoreHigh = LocalSemanticSearch.calculateSimilarity(
      "Apply to Software Engineer job",
      "Apply to Software Engineer role"
    );
    const scoreLow = LocalSemanticSearch.calculateSimilarity(
      "Apply to Software Engineer job",
      "Read active emails inbox list"
    );
    expect(scoreHigh).toBeGreaterThan(scoreLow);
    expect(scoreLow).toBeLessThan(0.1);
  });
});

describe("WorkingMemory and SessionMemory", () => {
  beforeEach(() => {
    WorkingMemory.clear();
    SessionMemory.clear();
  });

  it("sets and gets short-term values", () => {
    WorkingMemory.set("temp_step", "click_button");
    expect(WorkingMemory.get("temp_step")).toBe("click_button");
    expect(WorkingMemory.has("temp_step")).toBe(true);

    WorkingMemory.delete("temp_step");
    expect(WorkingMemory.has("temp_step")).toBe(false);
  });

  it("sets and gets session values", () => {
    SessionMemory.set("session_tab", 101);
    expect(SessionMemory.get("session_tab")).toBe(101);
  });
});

describe("LongTermMemoryService & ContextRetrieval", () => {
  beforeEach(() => {
    storageStore.lt_visited_sites = {};
    storageStore.lt_successful_paths = [];
    storageStore.lt_saved_prompts = [];
  });

  it("records site visits and increments metrics", async () => {
    await LongTermMemoryService.recordVisit("https://google.com/search");
    await LongTermMemoryService.recordVisit("https://google.com/about");
    const sites = await LongTermMemoryService.getVisitedSites();
    expect(sites.length).toBe(1);
    expect(sites[0].domain).toBe("google.com");
    expect(sites[0].visits).toBe(2);
  });

  it("retrieves contexts matching active url and goal using semantic search", async () => {
    await LongTermMemoryService.recordSuccessfulPath(
      "Apply to Software Engineer",
      "https://careers.google.com/jobs",
      ["click_element", "fill_input"]
    );
    await LongTermMemoryService.recordSuccessfulPath(
      "Read email list",
      "https://mail.google.com/inbox",
      ["click_element"]
    );

    const retrieval = await ContextRetrieval.retrieve(
      "Software Engineer job",
      "https://careers.google.com/jobs"
    );
    
    expect(retrieval.matchedPaths.length).toBe(1);
    expect(retrieval.matchedPaths[0].goal).toBe("Apply to Software Engineer");
    expect(retrieval.injectedContextPrompt).toContain("Historical successful automation runs");
  });
});
