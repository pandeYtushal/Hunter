import { NavigationAgent } from "../agents/NavigationAgent";
import { ElementLocator } from "./ElementLocator";
import { VisualMemory } from "./VisualMemory";
import type { VisualElement } from "./VisionTypes";

export const VisualActionEngine = {
  /**
   * Highlights a target element in the active viewport.
   */
  async highlightElement(tabId: number, selector: string, text?: string): Promise<void> {
    await chrome.tabs.sendMessage(tabId, {
      type: "HIGHLIGHT_DOM_ELEMENT",
      selector,
      text
    }).catch(() => null);
  },

  /**
   * Scrolls target viewport element smoothly to the center.
   */
  async scrollIntoView(tabId: number, selector: string): Promise<void> {
    await chrome.tabs.sendMessage(tabId, {
      type: "SCROLL_TO_ELEMENT",
      selector
    }).catch(() => null);
  },

  /**
   * Hovers cursor target element.
   */
  async hoverElement(tabId: number, selector: string): Promise<void> {
    await chrome.tabs.sendMessage(tabId, {
      type: "HOVER_ELEMENT",
      selector
    }).catch(() => null);
  },

  /**
   * Focuses on input using visual coordinates.
   */
  async focusByVision(tabId: number, element: VisualElement, url: string): Promise<void> {
    // 1. Locate
    const selector = await ElementLocator.findByVision(tabId, element.bounds);
    if (!selector) {
      throw new Error(`Failed to locate DOM element selector for visual input "${element.text}"`);
    }

    // 2. Validate & Highlight
    await this.highlightElement(tabId, selector);

    // 3. Execute
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: "FOCUS_INPUT",
        selector
      });
      if (!response?.ok) {
        throw new Error(response?.error || `Failed to focus input matching "${selector}"`);
      }
      
      // 4. Observe (record to memory)
      await VisualMemory.recordInteraction(url, element.text, element.type, "focus", true);
    } catch (e) {
      await VisualMemory.recordInteraction(url, element.text, element.type, "focus", false);
      throw e;
    }
  },

  /**
   * Performs element clicking using visual coordinates.
   */
  async clickByVision(tabId: number, element: VisualElement, url: string): Promise<void> {
    // 1. Locate
    const selector = await ElementLocator.findByVision(tabId, element.bounds);
    if (!selector) {
      throw new Error(`Failed to locate DOM element selector for visual action "${element.text}"`);
    }

    // 2. Validate & Highlight
    await this.highlightElement(tabId, selector);

    // 3. Execute
    try {
      await NavigationAgent.click(tabId, selector);
      
      // 4. Observe
      await VisualMemory.recordInteraction(url, element.text, element.type, "click", true);
    } catch (e) {
      await VisualMemory.recordInteraction(url, element.text, element.type, "click", false);
      throw e;
    }
  }
};
