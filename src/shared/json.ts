/**
 * A robust, fault-tolerant JSON parser that cleans common LLM output formatting errors
 * (such as markdown code blocks, comments, smart quotes, trailing commas, and unescaped control characters)
 * before attempting to parse the JSON string.
 */
export function robustJsonParse<T = unknown>(text: string): T {
  if (!text) {
    throw new Error("Cannot parse empty or undefined text");
  }

  // Find the JSON block (either an object {} or an array [])
  const jsonMatch = text.match(/\{[\s\S]*\}/) || text.match(/\[[\s\S]*\]/);
  let cleaned = jsonMatch ? jsonMatch[0] : text;

  // 1. Replace smart quotes with standard straight quotes
  cleaned = cleaned.replace(/[“”]/g, '"').replace(/[‘’]/g, "'");

  // 2. Remove single-line comments (ignoring // inside HTTP/HTTPS URLs)
  cleaned = cleaned.replace(/(?<!https?:)\/\/.*$/gm, "");

  // 3. Remove multi-line comments
  cleaned = cleaned.replace(/\/\*[\s\S]*?\*\//g, "");

  // 4. Remove trailing commas inside arrays or objects: ,] -> ] and ,} -> }
  cleaned = cleaned.replace(/,(\s*[\]}])/g, "$1");

  // 5. Escape raw control characters (except space, tab, cr, lf)
  // This cleans issues where models write raw tabs or newlines inside JSON strings.
  cleaned = cleaned.replace(/[\u0000-\u001F\u007F-\u009F]/g, (c) => {
    if (c === "\n") return "\\n";
    if (c === "\r") return "\\r";
    if (c === "\t") return "\\t";
    return "";
  });

  return JSON.parse(cleaned) as T;
}
