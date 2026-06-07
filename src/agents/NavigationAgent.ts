export const NavigationAgent = {
  async click(tabId: number, selector: string, text?: string): Promise<void> {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "CLICK_ELEMENT",
      selector,
      text
    });
    if (!response || !response.ok) {
      throw new Error(response?.error || `Failed to click element matching "${selector}"`);
    }
  },

  async fill(tabId: number, selector: string, value: string): Promise<void> {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "FILL_INPUT",
      selector,
      value
    });
    if (!response || !response.ok) {
      throw new Error(response?.error || `Failed to fill input matching "${selector}"`);
    }
  },

  async extract(tabId: number): Promise<string> {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "EXTRACT_TEXT"
    });
    if (response && response.ok) {
      return response.text;
    }
    throw new Error(response?.error || "Failed to extract text content from webpage.");
  },

  async navigate(tabId: number, url: string): Promise<void> {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "NAVIGATE_PAGE",
      url
    });
    if (!response || !response.ok) {
      throw new Error(response?.error || `Failed to navigate page window to "${url}"`);
    }
  },

  async highlightUpload(tabId: number): Promise<void> {
    const response = await chrome.tabs.sendMessage(tabId, {
      type: "UPLOAD_RESUME"
    });
    if (!response || !response.ok) {
      throw new Error(response?.error || "Failed to trigger file upload visual highlight.");
    }
  }
};
