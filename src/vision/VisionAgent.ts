import { VisionService } from "./VisionService";
import { ElementLocator } from "./ElementLocator";
import { VisualActionEngine } from "./VisualActionEngine";
import { VisualOverlay } from "./VisualOverlay";
import type { VisionDetectionResult } from "./VisionTypes";

export const VisionAgent = {
  /**
   * Run Gemini Vision analysis over the current active tab.
   */
  async analyzePage(tabId: number, goal: string): Promise<VisionDetectionResult> {
    return await VisionService.analyzePage(tabId, goal);
  },

  /**
   * Helper utility to locate and execute clicks based on a text label.
   */
  async locateAndClick(tabId: number, elementText: string, goal: string, url: string): Promise<void> {
    const matchedElement = await ElementLocator.findButton(tabId, elementText, goal);
    if (!matchedElement) {
      throw new Error(`Could not visually locate any button matching "${elementText}" for goal: "${goal}"`);
    }
    
    // Track last targeted element details
    await chrome.storage.local.set({ lastVisionTarget: matchedElement.text }).catch(() => null);
    
    await VisualActionEngine.clickByVision(tabId, matchedElement, url);
  },

  /**
   * Helper utility to locate and fill text inputs based on text label details.
   */
  async locateAndFill(
    tabId: number,
    elementText: string,
    value: string,
    goal: string,
    url: string
  ): Promise<void> {
    const matchedElement = await ElementLocator.findInput(tabId, elementText, goal);
    if (!matchedElement) {
      throw new Error(`Could not visually locate any text input field matching "${elementText}"`);
    }

    const selector = await ElementLocator.findByVision(tabId, matchedElement.bounds);
    if (!selector) {
      throw new Error(`Failed to map DOM element for input "${elementText}" using coordinates.`);
    }

    // Track last targeted element details
    await chrome.storage.local.set({ lastVisionTarget: matchedElement.text }).catch(() => null);

    // Validate highlight
    await VisualActionEngine.highlightElement(tabId, selector);

    // Execute
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "FILL_INPUT",
      selector,
      value
    });
    if (!response?.ok) {
      throw new Error(response?.error || `Failed to populate value into visually matched input.`);
    }
  },

  /**
   * Display visual detection boundary grids on webpage.
   */
  async showOverlay(tabId: number, goal: string): Promise<void> {
    const analysis = await VisionService.analyzePage(tabId, goal);
    await VisualOverlay.show(tabId, analysis.elements);
  },

  /**
   * Remove visual boundary overlays.
   */
  async hideOverlay(tabId: number): Promise<void> {
    await VisualOverlay.hide(tabId);
  }
};
