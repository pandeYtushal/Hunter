let cachedKey: CryptoKey | null = null;

async function getCryptoKey(): Promise<CryptoKey> {
  if (cachedKey) return cachedKey;

  const isExtension = typeof chrome !== "undefined" && typeof chrome.storage !== "undefined";
  let jwk: any = null;

  if (isExtension) {
    const res = await chrome.storage.local.get("cryptoKey");
    jwk = res.cryptoKey;
  } else {
    const stored = localStorage.getItem("cryptoKey");
    jwk = stored ? JSON.parse(stored) : null;
  }

  if (!jwk) {
    const generated = await crypto.subtle.generateKey(
      {
        name: "AES-GCM",
        length: 256
      },
      true,
      ["encrypt", "decrypt"]
    );
    const exported = await crypto.subtle.exportKey("jwk", generated);
    if (isExtension) {
      await chrome.storage.local.set({ cryptoKey: exported });
    } else {
      localStorage.setItem("cryptoKey", JSON.stringify(exported));
    }
    cachedKey = generated;
    return generated;
  }

  const imported = await crypto.subtle.importKey(
    "jwk",
    jwk,
    {
      name: "AES-GCM"
    },
    true,
    ["encrypt", "decrypt"]
  );
  cachedKey = imported;
  return imported;
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}

export const Encryption = {
  async encrypt(text: string): Promise<string> {
    if (!text) return "";
    try {
      const key = await getCryptoKey();
      const iv = crypto.getRandomValues(new Uint8Array(12));
      const encodedText = new TextEncoder().encode(text);
      const encrypted = await crypto.subtle.encrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        key,
        encodedText
      );

      const combined = new Uint8Array(iv.length + encrypted.byteLength);
      combined.set(iv, 0);
      combined.set(new Uint8Array(encrypted), iv.length);

      return arrayBufferToBase64(combined.buffer);
    } catch (e) {
      console.error("Encryption failed:", e);
      return text;
    }
  },

  async decrypt(encoded: string): Promise<string> {
    if (!encoded) return "";
    try {
      const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;
      if (!base64Regex.test(encoded)) {
        return encoded;
      }

      const combinedBuffer = base64ToArrayBuffer(encoded);
      const combined = new Uint8Array(combinedBuffer);
      if (combined.length < 12) {
        return encoded;
      }

      const iv = combined.slice(0, 12);
      const ciphertext = combined.slice(12);

      const key = await getCryptoKey();
      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: iv
        },
        key,
        ciphertext
      );

      return new TextDecoder().decode(decrypted);
    } catch (e) {
      return encoded;
    }
  }
};
