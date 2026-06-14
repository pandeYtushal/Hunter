const captureCache = new Map<string, { dataUrl: string; timestamp: number }>();
const CACHE_TTL_MS = 2000; // 2 seconds cache to avoid duplicate captures in tight reasoning steps

export const ScreenCapture = {
  /**
   * Captures the visible area of the specified tab (or active tab).
   * Returns a base64 encoded image Data URL.
   * Utilizes caching and image compression.
   */
  async captureTab(tabId: number): Promise<string> {
    const cacheKey = `tab_${tabId}`;
    const cached = captureCache.get(cacheKey);
    const now = Date.now();

    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.dataUrl;
    }

    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.captureVisibleTab) {
      return new Promise<string>((resolve, reject) => {
        // Find the window that holds this tab
        chrome.tabs.get(tabId, (tab) => {
          const windowId = tab?.windowId ?? chrome.windows.WINDOW_ID_CURRENT;
          
          // Capture visible tab with JPEG format compression (quality 80)
          chrome.tabs.captureVisibleTab(
            windowId,
            { format: "jpeg", quality: 80 },
            (dataUrl) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else if (!dataUrl) {
                reject(new Error("Captured empty screenshot data URL from active tab."));
              } else {
                captureCache.set(cacheKey, { dataUrl, timestamp: now });
                resolve(dataUrl);
              }
            }
          );
        });
      });
    }

    // Mock representation for test suites or fallback scenarios
    const fallbackData = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/";
    captureCache.set(cacheKey, { dataUrl: fallbackData, timestamp: now });
    return fallbackData;
  },

  /**
   * Clear captured screenshot caches.
   */
  clearCache(): void {
    captureCache.clear();
  }
};
