export const ConfidenceScoring = {
  /**
   * Calculates a dynamic confidence score between 0.0 and 1.0.
   * Weighs raw model confidence, consecutive failures, and history length.
   */
  calculate(
    rawConfidence: number,
    historyLength: number,
    consecutiveFailures: number
  ): number {
    let score = rawConfidence;

    // Ensure rawConfidence is within 0 and 1
    if (isNaN(score) || score < 0) score = 0.5;
    if (score > 1) score = 1.0;

    // Apply penalty for consecutive failures: -20% per failure
    if (consecutiveFailures > 0) {
      score -= consecutiveFailures * 0.20;
    }

    // Apply minor penalty for extremely long reasoning paths (diminishing return penalty)
    if (historyLength > 5) {
      score -= Math.min(0.15, (historyLength - 5) * 0.03);
    }

    // Clamp score strictly between 0.0 and 1.0
    return Math.max(0.0, Math.min(1.0, parseFloat(score.toFixed(2))));
  }
};
