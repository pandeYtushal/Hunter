import { AIManager } from "../ai/core/AIManager";
import { PromptManager } from "../ai/core/PromptManager";
import { ScreenCapture } from "./ScreenCapture";
import type { VisionDetectionResult } from "./VisionTypes";

const apiCache = new Map<string, { result: VisionDetectionResult; timestamp: number }>();
const API_CACHE_TTL_MS = 10000; // 10 seconds vision API caching


export const VisionService = {
  /**
   * Captures screen and sends base64 image data to AIManager Vision for UI layouts extraction.
   * Utilizes response caching to minimize API requests fees.
   */
  async analyzePage(tabId: number, goal: string): Promise<VisionDetectionResult> {
    const captureDataUrl = await ScreenCapture.captureTab(tabId);
    
    // Hash captured data + target goal to use as cache key
    const cacheKey = `${captureDataUrl.substring(0, 100)}:${goal}`;
    const cached = apiCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < API_CACHE_TTL_MS) {
      return cached.result;
    }

    // Strip header prefix: data:image/jpeg;base64,
    const base64Data = captureDataUrl.split(",")[1];
    if (!base64Data) {
      throw new Error("Invalid viewport screen capture base64 payload.");
    }

    const prompt = PromptManager.getVisionAnalyzePrompt(goal);
    const response = await AIManager.getInstance().vision({
      prompt,
      imageBufferOrBase64: base64Data,
      mimeType: "image/jpeg",
      goal
    });

    const parsedResult: VisionDetectionResult = {
      elements: response.elements || [],
      source: "vision",
      confidence: response.confidence ?? 0.9,
      reasoning: response.reasoning || ""
    };

    // Save screenshot & vision extraction data in storage for Developer Mode views
    await chrome.storage.local.set({
      lastScreenshot: captureDataUrl,
      lastVisionElements: parsedResult.elements,
      lastVisionConfidence: parsedResult.confidence,
      lastVisionReasoning: parsedResult.reasoning
    }).catch(() => null);

    apiCache.set(cacheKey, { result: parsedResult, timestamp: now });
    return parsedResult;
  },

  /**
   * Clear API response caching.
   */
  clearCache(): void {
    apiCache.clear();
  }
};
