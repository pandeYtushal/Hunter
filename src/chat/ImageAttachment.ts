import { ImageProcessor } from "./ImageProcessor";
import type { ChatAttachment } from "./ChatTypes";

export const ImageAttachment = {
  async create(file: File): Promise<ChatAttachment> {
    const { base64, mimeType } = await ImageProcessor.processImage(file);
    return {
      id: crypto.randomUUID(),
      name: file.name,
      type: "image",
      mimeType,
      base64Data: base64,
      size: file.size
    };
  }
};
