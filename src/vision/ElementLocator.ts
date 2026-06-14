import { VisionService } from "./VisionService";
import type { VisualElement, VisualBounds } from "./VisionTypes";

export const ElementLocator = {
  /**
   * Delegates normalized bounds mapping to content script, returning matching element selector.
   */
  async findByVision(tabId: number, bounds: VisualBounds): Promise<string | null> {
    try {
      const response = await chrome.tabs.sendMessage(tabId, {
        type: "LOCATE_ELEMENT_BY_BOUNDS",
        bounds
      });
      return response?.ok && response.selector ? response.selector : null;
    } catch (err) {
      console.warn("ElementLocator: failed to communicate with content script inside tab.", err);
      return null;
    }
  },

  /**
   * Resolves a button using visual coordinates.
   */
  async findButton(tabId: number, text: string, goal: string): Promise<VisualElement | null> {
    const analysis = await VisionService.analyzePage(tabId, goal);
    return analysis.elements.find(
      (el) =>
        (el.type === "button" || el.type === "cta" || el.type === "navigation") &&
        el.text.toLowerCase().includes(text.toLowerCase())
    ) ?? null;
  },

  /**
   * Resolves an input using visual coordinates.
   */
  async findInput(tabId: number, text: string, goal: string): Promise<VisualElement | null> {
    const analysis = await VisionService.analyzePage(tabId, goal);
    return analysis.elements.find(
      (el) =>
        el.type === "input" &&
        (el.text.toLowerCase().includes(text.toLowerCase()) || el.id.toLowerCase().includes(text.toLowerCase()))
    ) ?? null;
  },

  /**
   * Resolves an upload field using visual coordinates.
   */
  async findUpload(tabId: number, goal: string): Promise<VisualElement | null> {
    const analysis = await VisionService.analyzePage(tabId, goal);
    return analysis.elements.find((el) => el.type === "upload_area") ?? null;
  },

  /**
   * Resolves a dialog or popup boundary.
   */
  async findDialog(tabId: number, goal: string): Promise<VisualElement | null> {
    const analysis = await VisionService.analyzePage(tabId, goal);
    return analysis.elements.find((el) => el.type === "dialog") ?? null;
  },

  /**
   * Resolves a navigation element using visual coordinates.
   */
  async findNavigation(tabId: number, text: string, goal: string): Promise<VisualElement | null> {
    const analysis = await VisionService.analyzePage(tabId, goal);
    return analysis.elements.find(
      (el) => el.type === "navigation" && el.text.toLowerCase().includes(text.toLowerCase())
    ) ?? null;
  },

  /**
   * Resolves any element matching general text parameter.
   */
  async findByText(tabId: number, text: string, goal: string): Promise<VisualElement | null> {
    const analysis = await VisionService.analyzePage(tabId, goal);
    return analysis.elements.find((el) => el.text.toLowerCase().includes(text.toLowerCase())) ?? null;
  },

  /**
   * Resolves element matching general role classification.
   */
  async findByRole(tabId: number, role: string, goal: string): Promise<VisualElement | null> {
    const analysis = await VisionService.analyzePage(tabId, goal);
    return analysis.elements.find((el) => el.type === role) ?? null;
  }
};
