/**
 * A robust, fault-tolerant JSON parser that cleans common LLM output formatting errors
 * (such as markdown code blocks, comments, smart quotes, trailing commas, and unescaped control characters)
 * before attempting to parse the JSON string.
 */
export function robustJsonParse<T = unknown>(text: string): T {
  if (!text) {
    throw new Error("Cannot parse empty or undefined text");
  }

  // Helper to extract all balanced {...} and [...] substrings
  const getBalancedCandidates = (source: string): string[] => {
    const candidates: string[] = [];
    for (let i = 0; i < source.length; i++) {
      const char = source[i];
      if (char === "{" || char === "[") {
        const openBrace = char;
        const closeBrace = openBrace === "{" ? "}" : "]";
        let balance = 0;
        let endIndex = -1;
        let inString = false;
        let escapeNext = false;

        for (let j = i; j < source.length; j++) {
          const c = source[j];

          if (escapeNext) {
            escapeNext = false;
            continue;
          }

          if (c === "\\") {
            escapeNext = true;
            continue;
          }

          if (c === '"') {
            inString = !inString;
            continue;
          }

          if (!inString) {
            if (c === openBrace) {
              balance++;
            } else if (c === closeBrace) {
              balance--;
              if (balance === 0) {
                endIndex = j;
                break;
              }
            }
          }
        }

        if (endIndex !== -1) {
          candidates.push(source.slice(i, endIndex + 1));
        }
      }
    }
    return candidates;
  };

  // 1. Collect potential JSON candidates.
  // First, extract text inside markdown code blocks (e.g. ```json ... ```)
  const codeBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/g;
  let match;
  const rawCandidates: string[] = [];

  while ((match = codeBlockRegex.exec(text)) !== null) {
    const codeContent = match[1].trim();
    rawCandidates.push(...getBalancedCandidates(codeContent));
  }

  // Second, extract candidates from the entire raw text
  rawCandidates.push(...getBalancedCandidates(text));

  // Remove duplicates and sort by length descending (longest/most complete candidates first)
  const uniqueCandidates = Array.from(new Set(rawCandidates)).sort((a, b) => b.length - a.length);

  if (uniqueCandidates.length === 0) {
    throw new Error("No JSON object or array found in the text");
  }

  // 2. Try to clean and parse each candidate
  let lastError: Error | null = null;
  for (const candidate of uniqueCandidates) {
    try {
      let cleaned = candidate;

      // 1. Replace smart quotes with standard straight quotes
      cleaned = cleaned.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

      // 2. Remove single-line comments (ignoring // inside HTTP/HTTPS URLs)
      cleaned = cleaned.replace(/(?<!https?:)\/\/.*$/gm, "");

      // 3. Remove multi-line comments
      cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");

      // 4. Remove trailing commas inside arrays or objects: ,] -> ] and ,} -> }
      cleaned = cleaned.replace(/,(\s*[\]}])/g, "$1");

      // 5. Escape raw control characters ONLY inside string literals
      // This preserves structural formatting newlines/tabs while preventing SyntaxErrors for unescaped content inside values.
      cleaned = cleaned.replace(/"(?:[^"\\]|\\.)*"/g, (strVal) => {
        return strVal.replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
          if (c === "\n") return "\\n";
          if (c === "\r") return "\\r";
          if (c === "\t") return "\\t";
          return "";
        });
      });

      return JSON.parse(cleaned) as T;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
    }
  }

  throw lastError || new Error("Failed to parse any extracted JSON candidates");
}

