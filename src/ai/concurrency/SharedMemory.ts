export class SharedMemory {
  static async get(key: string): Promise<any> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return null;
    const data = await chrome.storage.local.get("sharedMemory");
    const memory = data?.sharedMemory || {};
    return memory[key];
  }

  static async set(key: string, value: any): Promise<void> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    const data = await chrome.storage.local.get("sharedMemory");
    const memory = data?.sharedMemory || {};
    memory[key] = value;
    await chrome.storage.local.set({ sharedMemory: memory });
  }

  static async clear(): Promise<void> {
    if (typeof chrome === "undefined" || !chrome.storage?.local) return;
    await chrome.storage.local.remove("sharedMemory");
  }
}
