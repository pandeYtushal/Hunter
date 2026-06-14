import type { VisualElement } from "./VisionTypes";

export const VisualOverlay = {
  /**
   * Instructs target content script to overlay detection bounding boxes.
   */
  async show(tabId: number, elements: VisualElement[]): Promise<void> {
    await chrome.tabs.sendMessage(tabId, {
      type: "SHOW_VISUAL_OVERLAY",
      elements
    }).catch(() => null);
  },

  /**
   * Instructs target content script to hide detection bounding boxes.
   */
  async hide(tabId: number): Promise<void> {
    await chrome.tabs.sendMessage(tabId, {
      type: "HIDE_VISUAL_OVERLAY"
    }).catch(() => null);
  }
};
