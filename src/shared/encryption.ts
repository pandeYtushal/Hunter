export const Encryption = {
  encrypt(text: string): string {
    if (!text) return "";
    const key = "hunter_secret_key_1298";
    let result = "";
    for (let i = 0; i < text.length; i++) {
      const charCode = text.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      result += String.fromCharCode(charCode);
    }
    return btoa(result);
  },
  decrypt(encoded: string): string {
    if (!encoded) return "";
    try {
      // Check if it is a valid base64 string
      const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
      if (!base64Regex.test(encoded)) {
        return encoded; // Plain text
      }
      const decoded = atob(encoded);
      const key = "hunter_secret_key_1298";
      let result = "";
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        result += String.fromCharCode(charCode);
      }
      // If it contains non-ASCII characters or looks totally garbled, it might just be a key that happened to match base64.
      // We check if the result is mostly printable ASCII.
      const isPrintable = /^[\x20-\x7E\s]*$/.test(result);
      if (!isPrintable) {
        return encoded;
      }
      return result;
    } catch (e) {
      return encoded; // Fallback for plain text
    }
  }
};
