export const ImageProcessor = {
  /**
   * Validates if a file is an image of the supported formats (PNG, JPEG, WEBP)
   */
  isValidFormat(file: File): boolean {
    const validTypes = ["image/png", "image/jpeg", "image/webp"];
    return validTypes.includes(file.type);
  },

  /**
   * Resizes and compresses an image file to a base64 string using browser canvas APIs.
   * Limits max dimensions to 1024px to control prompt size and token counts.
   */
  async processImage(
    file: File,
    maxWidth = 1024,
    maxHeight = 1024,
    quality = 0.8
  ): Promise<{ base64: string; mimeType: string }> {
    if (!this.isValidFormat(file)) {
      throw new Error("Unsupported image format. Please upload PNG, JPEG, or WEBP.");
    }

    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          // Calculate scale ratios
          let width = img.width;
          let height = img.height;

          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          // Create canvas
          const canvas = document.createElement("canvas");
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            reject(new Error("Failed to create canvas 2D context."));
            return;
          }

          ctx.drawImage(img, 0, 0, width, height);

          // Get base64 string
          const mimeType = file.type;
          const dataUrl = canvas.toDataURL(mimeType, quality);
          const base64 = dataUrl.split(",")[1];

          if (!base64) {
            reject(new Error("Failed to extract base64 from processed canvas."));
          } else {
            resolve({ base64, mimeType });
          }
        };
        img.onerror = () => reject(new Error("Failed to load image element."));
        img.src = e.target?.result as string;
      };
      reader.onerror = () => reject(new Error("Failed to read file contents."));
      reader.readAsDataURL(file);
    });
  }
};
