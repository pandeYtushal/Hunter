import type { ChatAttachment } from "./ChatTypes";
import { ImageAttachment } from "./ImageAttachment";
import { ScreenshotAttachment } from "./ScreenshotAttachment";

export class AttachmentManager {
  private attachments: ChatAttachment[] = [];

  getAttachments(): ChatAttachment[] {
    return this.attachments;
  }

  async addFile(file: File): Promise<ChatAttachment> {
    // Validate size (< 5MB)
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("File size exceeds 5MB limit.");
    }
    const att = await ImageAttachment.create(file);
    this.attachments.push(att);
    return att;
  }

  async addScreenshot(tabId?: number): Promise<ChatAttachment> {
    const att = await ScreenshotAttachment.capture(tabId);
    this.attachments.push(att);
    return att;
  }

  removeAttachment(id: string): void {
    this.attachments = this.attachments.filter((a) => a.id !== id);
  }

  clear(): void {
    this.attachments = [];
  }
}
