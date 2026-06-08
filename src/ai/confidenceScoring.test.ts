import { describe, expect, it } from "vitest";
import { ConfidenceScoring } from "./confidenceScoring";

describe("ConfidenceScoring", () => {
  it("uses raw confidence when no failures or long execution logs exist", () => {
    const score = ConfidenceScoring.calculate(0.9, 0, 0);
    expect(score).toBe(0.9);
  });

  it("penalizes score based on consecutive failures", () => {
    const score = ConfidenceScoring.calculate(0.9, 0, 1);
    expect(score).toBe(0.7); // 0.9 - 1 * 0.20
  });

  it("penalizes score slightly for long reasoning history", () => {
    const score = ConfidenceScoring.calculate(0.9, 6, 0);
    expect(score).toBe(0.87); // 0.9 - 1 * 0.03
  });

  it("clamps score strictly between 0.0 and 1.0", () => {
    const minScore = ConfidenceScoring.calculate(-0.5, 0, 5);
    expect(minScore).toBe(0.0);

    const maxScore = ConfidenceScoring.calculate(1.5, 0, 0);
    expect(maxScore).toBe(1.0);
  });
});
