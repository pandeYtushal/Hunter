import { robustJsonParse } from "../shared/json";
import type { VisionDetectionResult, VisualElement } from "./VisionTypes";

export const VisionParser = {
  /**
   * Converts the raw Gemini text response into a structured VisionDetectionResult.
   * Tolerates and fixes malformed JSON blocks.
   */
  parse(rawResponse: string): VisionDetectionResult {
    try {
      // Robust JSON parsing handles markdown wrappers, comments, etc.
      const parsed = robustJsonParse<any>(rawResponse);
      
      const elements: VisualElement[] = (parsed.elements || []).map((el: any, index: number) => {
        const id = el.id ? String(el.id) : `vis-el-${index}-${Math.random().toString(36).substring(2, 6)}`;
        const type = el.type || "button";
        const text = el.text ? String(el.text).trim() : "";
        
        // Ensure bounds coordinates are formatted normalized between 0 and 1000
        const bounds = {
          ymin: typeof el.bounds?.ymin === "number" ? Math.max(0, Math.min(1000, el.bounds.ymin)) : 0,
          xmin: typeof el.bounds?.xmin === "number" ? Math.max(0, Math.min(1000, el.bounds.xmin)) : 0,
          ymax: typeof el.bounds?.ymax === "number" ? Math.max(0, Math.min(1000, el.bounds.ymax)) : 1000,
          xmax: typeof el.bounds?.xmax === "number" ? Math.max(0, Math.min(1000, el.bounds.xmax)) : 1000
        };

        const confidence = typeof el.confidence === "number" ? Math.max(0, Math.min(1, el.confidence)) : 0.8;
        const importance = el.importance === "high" || el.importance === "medium" || el.importance === "low" 
          ? el.importance 
          : "medium";

        const actions = Array.isArray(el.actions) ? el.actions.map(String) : [];

        return {
          id,
          type,
          text,
          bounds,
          confidence,
          importance,
          actions
        };
      });

      const globalConfidence = typeof parsed.confidence === "number" 
        ? Math.max(0, Math.min(1, parsed.confidence)) 
        : (elements.length > 0 ? 0.85 : 0.1);
      const reasoning = parsed.reasoning ? String(parsed.reasoning).trim() : "Successfully detected layout elements visually.";

      return {
        elements,
        source: "vision",
        confidence: globalConfidence,
        reasoning
      };
    } catch (e) {
      console.error("Failed to parse Gemini Vision JSON output. Raw response content:", rawResponse, e);
      return {
        elements: [],
        source: "vision",
        confidence: 0.1,
        reasoning: `Parsing error during structured visual extraction: ${e instanceof Error ? e.message : String(e)}`
      };
    }
  }
};
