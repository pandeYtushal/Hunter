export class NotificationCenter {
  static async sendToast(title: string, message: string, duration?: number): Promise<void> {
    if (typeof chrome === "undefined" || !chrome.tabs?.query) return;
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const tab = tabs[0];
      if (tab?.id) {
        await chrome.tabs.sendMessage(tab.id, {
          type: "SHOW_TOAST",
          title,
          message,
          duration
        }).catch(() => null);
      }
    } catch (e) {
      console.warn("NotificationCenter failed to send toast notification:", e);
    }
  }

  static async setBadge(text: string, color = "#ff6b35"): Promise<void> {
    if (typeof chrome !== "undefined" && chrome.action?.setBadgeText) {
      await chrome.action.setBadgeText({ text });
      await chrome.action.setBadgeBackgroundColor({ color });
    }
  }

  static async clearBadge(): Promise<void> {
    if (typeof chrome !== "undefined" && chrome.action?.setBadgeText) {
      await chrome.action.setBadgeText({ text: "" });
    }
  }
}
