const captureCache = new Map<string, { dataUrl: string; timestamp: number }>();
const CACHE_TTL_MS = 2000; // 2 seconds cache to avoid duplicate captures in tight reasoning steps

const dataUrlToBlob = (dataUrl: string): Blob => {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(parts[1]);
  let n = bstr.length;
  const u8arr = new Uint8Array(n);
  while (n--) {
    u8arr[n] = bstr.charCodeAt(n);
  }
  return new Blob([u8arr], { type: mime });
};

const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

const downscaleImage = async (dataUrl: string, maxWidth = 1280): Promise<string> => {
  try {
    if (typeof OffscreenCanvas === "undefined" || typeof createImageBitmap === "undefined") {
      return dataUrl;
    }
    const blob = dataUrlToBlob(dataUrl);
    const imageBitmap = await createImageBitmap(blob);
    
    let { width, height } = imageBitmap;
    if (width <= maxWidth && height <= maxWidth) {
      return dataUrl;
    }
    
    if (width > height) {
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
    } else {
      if (height > maxWidth) {
        width = Math.round((width * maxWidth) / height);
        height = maxWidth;
      }
    }
    
    const canvas = new OffscreenCanvas(width, height);
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return dataUrl;
    }
    
    ctx.drawImage(imageBitmap, 0, 0, width, height);
    const outputBlob = await canvas.convertToBlob({ type: "image/jpeg", quality: 0.8 });
    return await blobToBase64(outputBlob);
  } catch (error) {
    console.warn("Failed to downscale screenshot via OffscreenCanvas:", error);
    return dataUrl;
  }
};

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
            async (dataUrl) => {
              if (chrome.runtime.lastError) {
                reject(new Error(chrome.runtime.lastError.message));
              } else if (!dataUrl) {
                reject(new Error("Captured empty screenshot data URL from active tab."));
              } else {
                const scaledUrl = await downscaleImage(dataUrl);
                captureCache.set(cacheKey, { dataUrl: scaledUrl, timestamp: now });
                resolve(scaledUrl);
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
