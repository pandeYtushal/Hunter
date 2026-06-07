import { describe, expect, it } from "vitest";
import { IntentClassifier } from "./intentClassifier";

describe("IntentClassifier", () => {
  it("detects job application intent deterministically", () => {
    const result = IntentClassifier.classify("Apply for this job and start the application");
    expect(result.intent).toBe("APPLY_JOB");
    expect(result.confidence).toBeGreaterThan(0.4);
  });

  it("detects save job intent", () => {
    expect(IntentClassifier.classify("Save this posting to my tracker").intent).toBe("SAVE_JOB");
  });

  it("falls back for unrelated chat", () => {
    expect(IntentClassifier.classify("hello there").intent).toBe("CHAT_FALLBACK");
  });
});
