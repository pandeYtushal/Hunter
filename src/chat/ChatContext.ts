import { ScreenCapture } from "../vision/ScreenCapture";
import { longTermMemory } from "../ai/longTermMemory";
import { memory } from "../ai/memory";
import { storage } from "../shared/storage";
import type { PageSnapshot, BrowserStateModel } from "../shared/types/messages";
import type { ChatContextInfo } from "./ChatTypes";

export const ChatContext = {
  async getActiveTab(): Promise<chrome.tabs.Tab | null> {
    if (typeof chrome === "undefined" || !chrome.tabs) return null;
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        resolve(tabs[0] || null);
      });
    });
  },

  async requestPageSnapshot(): Promise<PageSnapshot | null> {
    if (typeof chrome === "undefined" || !chrome.runtime) return null;
    try {
      const response = await chrome.runtime.sendMessage({
        type: "SEND_TO_ACTIVE_TAB",
        message: { type: "GET_PAGE_SNAPSHOT" },
      });
      return response?.snapshot || null;
    } catch (err) {
      console.warn("Failed to request page snapshot:", err);
      return null;
    }
  },

  async requestBrowserStateModel(): Promise<BrowserStateModel | null> {
    if (typeof chrome === "undefined" || !chrome.runtime) return null;
    try {
      const response = await chrome.runtime.sendMessage({
        type: "SEND_TO_ACTIVE_TAB",
        message: { type: "GET_BROWSER_STATE_MODEL" },
      });
      return response?.model || null;
    } catch (err) {
      console.warn("Failed to request browser state model:", err);
      return null;
    }
  },

  async captureScreenshot(tabId?: number): Promise<string | null> {
    try {
      let targetTabId = tabId;
      if (!targetTabId) {
        const tab = await this.getActiveTab();
        targetTabId = tab?.id;
      }
      if (!targetTabId) return null;
      const dataUrl = await ScreenCapture.captureTab(targetTabId);
      // Return raw base64 data (without the data:image/jpeg;base64, prefix)
      const parts = dataUrl.split(",");
      return parts[1] || null;
    } catch (err) {
      console.warn("Failed to capture screen:", err);
      return null;
    }
  },

  async gatherContext(): Promise<ChatContextInfo> {
    const tab = await this.getActiveTab();
    const pageSnapshot = await this.requestPageSnapshot();
    const browserStateModel = await this.requestBrowserStateModel();
    const screenshotBase64 = await this.captureScreenshot(tab?.id ?? undefined);
    
    const ltm = await longTermMemory.retrieveMemory().catch(() => null);
    const agentState = await memory.getAgentState().catch(() => null);
    const profile = (await storage.get("profile").catch(() => null)) || null;

    return {
      currentUrl: tab?.url || pageSnapshot?.url || "",
      pageSnapshot,
      browserStateModel,
      selectedText: pageSnapshot?.selectedText || "",
      screenshotBase64,
      longTermMemory: ltm,
      currentGoal: agentState?.goal || null,
      currentAgent: agentState?.currentAgent || null,
      profile
    };
  }
};
