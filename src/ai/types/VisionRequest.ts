export interface VisionRequest {
  prompt: string;
  imageBufferOrBase64: string; // Base64 representation of the viewport screenshot
  mimeType?: string; // e.g. "image/jpeg"
  goal?: string;
}
