import type { ChatAttachment } from "./ChatTypes";
import { ImageProcessor } from "./ImageProcessor";
import { ImageAttachment } from "./ImageAttachment";

export const ClipboardManager = {
  /**
   * Processes paste event on textarea and checks if there are image transfer items.
   * Returns a promise with newly created ChatAttachment if image was pasted.
   */
  async handlePaste(e: React.ClipboardEvent<HTMLTextAreaElement | HTMLInputElement>): Promise<ChatAttachment | null> {
    const items = e.clipboardData?.items;
    if (!items) return null;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        const file = item.getAsFile();
        if (file) {
          if (!ImageProcessor.isValidFormat(file)) {
            throw new Error("Unsupported clipboard image format. Must be PNG, JPEG, or WEBP.");
          }
          if (file.size > 5 * 1024 * 1024) {
            throw new Error("Pasted image exceeds 5MB size limit.");
          }
          return await ImageAttachment.create(file);
        }
      }
    }
    return null;
  }
};
