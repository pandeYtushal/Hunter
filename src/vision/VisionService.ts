import { storage } from "../shared/storage";
import { ScreenCapture } from "./ScreenCapture";
import { VisionParser } from "./VisionParser";
import type { VisionDetectionResult } from "./VisionTypes";

const apiCache = new Map<string, { result: VisionDetectionResult; timestamp: number }>();
const API_CACHE_TTL_MS = 10000; // 10 seconds vision API caching

export const VisionService = {
  /**
   * Captures screen and sends base64 image data to Gemini Vision for UI layouts extraction.
   * Utilizes response caching to minimize API requests fees.
   */
  async analyzePage(tabId: number, goal: string): Promise<VisionDetectionResult> {
    const settings = await storage.get("settings").catch(() => null);
    const apiKey = settings?.apiKey?.trim();
    if (!apiKey) {
      throw new Error("Missing Gemini API Key. Go to Hunter settings page to configure it.");
    }

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

    const geminiModel = settings?.provider === "gemini" ? (import.meta.env.VITE_GEMINI_MODEL || "gemini-3.5-flash") : "gemini-3.5-flash";
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${apiKey}`;

    const prompt = `Analyze this webpage screenshot to help accomplish the user's goal: "${goal}".
Detect visible user interface elements including:
- Buttons (type: "button", actions: ["click"])
- Inputs (type: "input", actions: ["focus", "fill"])
- Forms (type: "form")
- Dropdowns (type: "dropdown", actions: ["click"])
- Checkboxes (type: "checkbox", actions: ["click"])
- Dialogs (type: "dialog")
- Upload Areas (type: "upload_area", actions: ["click"])
- Navigation links/items (type: "navigation", actions: ["click"])
- Important Sections (type: "section")
- Call To Action buttons (type: "cta", actions: ["click"])

For each element, you MUST return:
1. id: unique string identifier
2. type: element type from the list above
3. text: label, visible text, or placeholder
4. bounds: normalized bounding box {"ymin": ymin, "xmin": xmin, "ymax": ymax, "xmax": xmax} from 0 to 1000 relative to the image size. ymin is top, xmin is left, ymax is bottom, xmax is right.
5. confidence: prediction confidence score between 0.0 and 1.0
6. importance: "high", "medium", or "low"
7. actions: array of actions, e.g. ["click"]

You must respond with a raw JSON block matching this schema (do not wrap in markdown or markdown code fences):
{
  "reasoning": "Brief overview of what is visible on this screen and the general layout relative to the goal.",
  "confidence": 0.95,
  "elements": [
    {
      "id": "el-1",
      "type": "cta",
      "text": "Apply Now",
      "bounds": {"ymin": 350, "xmin": 400, "ymax": 395, "xmax": 600},
      "confidence": 0.98,
      "importance": "high",
      "actions": ["click"]
    }
  ]
}`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: prompt },
              {
                inlineData: {
                  mimeType: "image/jpeg",
                  data: base64Data
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.1,
          responseMimeType: "application/json"
        }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      throw new Error(data.error?.message || `Gemini API returned status code ${response.status}`);
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      throw new Error("Gemini API did not return any candidate contents.");
    }

    const parsedResult = VisionParser.parse(text);

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
