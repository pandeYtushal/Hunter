const STOP_WORDS = new Set(["the", "of", "and", "to", "in", "for", "on", "a", "at", "with", "by", "is", "this", "that", "it", "from", "an"]);

export class LocalSemanticSearch {
  /**
   * Tokenize input string by converting to lowercase, removing punctuation, and filtering out stop words.
   */
  static tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .split(/\s+/)
      .filter((word) => word.length > 1 && !STOP_WORDS.has(word));
  }

  /**
   * Calculates cosine similarity score between two documents.
   */
  static calculateSimilarity(docA: string, docB: string): number {
    const tokensA = this.tokenize(docA);
    const tokensB = this.tokenize(docB);

    if (tokensA.length === 0 || tokensB.length === 0) return 0;

    // Create unique vocabulary map
    const vocab = new Set([...tokensA, ...tokensB]);

    // Build Term Frequency maps
    const tfA: Record<string, number> = {};
    const tfB: Record<string, number> = {};

    tokensA.forEach((t) => (tfA[t] = (tfA[t] || 0) + 1));
    tokensB.forEach((t) => (tfB[t] = (tfB[t] || 0) + 1));

    // Vector calculations
    let dotProduct = 0;
    let magnitudeA = 0;
    let magnitudeB = 0;

    vocab.forEach((term) => {
      const valA = tfA[term] || 0;
      const valB = tfB[term] || 0;

      dotProduct += valA * valB;
      magnitudeA += valA * valA;
      magnitudeB += valB * valB;
    });

    if (magnitudeA === 0 || magnitudeB === 0) return 0;
    return dotProduct / (Math.sqrt(magnitudeA) * Math.sqrt(magnitudeB));
  }

  /**
   * Sorts and filters documents based on similarity score against the target query.
   */
  static search<T>(
    query: string,
    items: T[],
    getText: (item: T) => string,
    minThreshold = 0.15
  ): Array<{ item: T; score: number }> {
    const scored = items.map((item) => {
      const text = getText(item);
      const score = this.calculateSimilarity(query, text);
      return { item, score };
    });

    return scored
      .filter((entry) => entry.score >= minThreshold)
      .sort((a, b) => b.score - a.score);
  }
}
