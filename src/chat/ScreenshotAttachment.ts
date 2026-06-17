import { ChatContext } from "./ChatContext";
import type { ChatAttachment } from "./ChatTypes";

export const ScreenshotAttachment = {
  async capture(tabId?: number): Promise<ChatAttachment> {
    const base64 = await ChatContext.captureScreenshot(tabId);
    if (!base64) {
      throw new Error("Failed to capture tab screenshot base64 data.");
    }
    return {
      id: crypto.randomUUID(),
      name: `screenshot-${new Date().toLocaleTimeString().replace(/:/g, "-")}.jpeg`,
      type: "screenshot",
      mimeType: "image/jpeg",
      base64Data: base64
    };
  }
};
