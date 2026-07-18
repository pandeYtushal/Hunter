import { VisionService } from "./VisionService";
import { ElementLocator } from "./ElementLocator";
import type { PageSnapshot } from "../shared/types/messages";

export interface LocateQueryResult {
  selector: string;
  source: "vision" | "dom" | "accessibility" | "text_search";
}

export class VisionEngine {
  static async locate(
    tabId: number,
    role: string,
    goal: string,
    pageContext?: PageSnapshot,
    excludeSelectors: string[] = []
  ): Promise<LocateQueryResult> {
    
    // Tier 1: Vision (VLM Screenshot matching)
    try {
      const analysis = await VisionService.analyzePage(tabId, goal);
      const targetElement = analysis.elements.find(
        (el) =>
          el.type === role &&
          (el.text.toLowerCase().includes(goal.toLowerCase()) || goal.toLowerCase().includes(el.text.toLowerCase()))
      );

      if (targetElement) {
        const selector = await ElementLocator.findByVision(tabId, targetElement.bounds);
        if (selector && !excludeSelectors.includes(selector)) {
          return { selector, source: "vision" };
        }
      }
    } catch (err) {
      console.warn("Vision locator tier failed, attempting DOM fallback:", err);
    }

    // Tiers 2, 3, and 4: Delegate to locateHybrid in Content Script
    
    // Tier 2: Standard DOM
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: "LOCATE_ELEMENT_HYBRID",
        query: { selector: goal },
        excludeSelectors
      });
      if (response?.ok && response.selector) {
        return { selector: response.selector, source: "dom" };
      }
    } catch (err) {
      console.warn("DOM locator tier check failed:", err);
    }

    // Tier 3: Accessibility Tree (ARIA roles)
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: "LOCATE_ELEMENT_HYBRID",
        query: { role, text: goal },
        excludeSelectors
      });
      if (response?.ok && response.selector) {
        return { selector: response.selector, source: "accessibility" };
      }
    } catch (err) {
      console.warn("Accessibility locator tier check failed:", err);
    }

    // Tier 4: Text Search (inner Text and placeholder scans)
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: "LOCATE_ELEMENT_HYBRID",
        query: { text: goal },
        excludeSelectors
      });
      if (response?.ok && response.selector) {
        return { selector: response.selector, source: "text_search" };
      }
    } catch (err) {
      console.warn("Text search locator tier check failed:", err);
    }

    // Tier 5: Failure
    throw new Error(`Failed to locate target element for "${goal}" (role: "${role}") across all hybrid vision tiers.`);
  }
}
