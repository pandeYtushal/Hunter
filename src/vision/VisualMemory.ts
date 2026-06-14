import { storage } from "../shared/storage";
import type { VisualInteraction } from "./VisionTypes";

export const VisualMemory = {
  /**
   * Appends a record of a visual action click/interaction to storage.
   */
  async recordInteraction(
    url: string,
    elementText: string,
    elementType: string,
    action: string,
    success: boolean
  ): Promise<void> {
    const memoryKey = "visualMemory";
    const data = (await storage.get(memoryKey).catch(() => null)) as any;
    
    const interactions: VisualInteraction[] = data?.interactions ? [...data.interactions] : [];
    
    const newEntry: VisualInteraction = {
      url,
      elementText,
      elementType,
      action,
      timestamp: new Date().toISOString(),
      success
    };

    interactions.unshift(newEntry);
    
    // Maintain cache depth of last 50 visual actions
    const trimmed = interactions.slice(0, 50);
    
    await storage.set(memoryKey, {
      ...data,
      interactions: trimmed
    }).catch(() => null);

    // Sync visualMemory list inside chrome.storage.local for dev view
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ visualMemory: { interactions: trimmed } }).catch(() => null);
    }
  },

  /**
   * Retrieves visual interactions history stack.
   */
  async getInteractions(): Promise<VisualInteraction[]> {
    const data = (await storage.get("visualMemory").catch(() => null)) as any;
    return data?.interactions ?? [];
  },

  /**
   * Reset logs cache completely.
   */
  async clearMemory(): Promise<void> {
    await storage.set("visualMemory", { interactions: [], layouts: [] }).catch(() => null);
    if (typeof chrome !== "undefined" && chrome.storage && chrome.storage.local) {
      await chrome.storage.local.set({ visualMemory: { interactions: [] } }).catch(() => null);
    }
  }
};
