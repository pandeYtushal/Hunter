import { defaultStorage, type StorageSchema } from "./types/storage";

type StorageKey = keyof StorageSchema;
type StorageFallbacks = Partial<StorageSchema> | StorageKey;

const isExtension = typeof chrome !== "undefined" && typeof chrome.storage !== "undefined";

const SYNC_KEYS = ["settings", "sidebarOpen"];
const isSyncKey = (key: string): boolean => SYNC_KEYS.includes(key);

const storageArea = {
  async get(keys: StorageFallbacks): Promise<Partial<StorageSchema>> {
    if (isExtension) {
      if (typeof keys === "string") {
        if (isSyncKey(keys)) {
          return chrome.storage.sync.get(keys);
        } else {
          return chrome.storage.local.get(keys);
        }
      } else {
        const syncKeys: any = {};
        const localKeys: any = {};
        for (const [k, v] of Object.entries(keys)) {
          if (isSyncKey(k)) {
            syncKeys[k] = v;
          } else {
            localKeys[k] = v;
          }
        }
        const [syncResult, localResult] = await Promise.all([
          Object.keys(syncKeys).length > 0 ? chrome.storage.sync.get(syncKeys) : Promise.resolve({}),
          Object.keys(localKeys).length > 0 ? chrome.storage.local.get(localKeys) : Promise.resolve({})
        ]);
        return { ...syncResult, ...localResult };
      }
    }

    const isDev = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV;

    const res: Partial<StorageSchema> = {};
    if (typeof keys === "string") {
      if (keys === "apiKeys" && !isDev) {
        return { apiKeys: defaultStorage.apiKeys };
      }
      const val = localStorage.getItem(keys);
      res[keys] = val ? JSON.parse(val) : defaultStorage[keys as StorageKey];
    } else {
      for (const [k, fallbackVal] of Object.entries(keys)) {
        if (k === "apiKeys" && !isDev) {
          res[k as StorageKey] = defaultStorage.apiKeys;
          continue;
        }
        const val = localStorage.getItem(k);
        res[k as StorageKey] = val ? JSON.parse(val) : fallbackVal;
      }
    }
    return res;
  },

  async set(items: Partial<StorageSchema>): Promise<void> {
    if (isExtension) {
      const syncItems: any = {};
      const localItems: any = {};
      for (const [k, v] of Object.entries(items)) {
        if (isSyncKey(k)) {
          syncItems[k] = v;
        } else {
          localItems[k] = v;
        }
      }
      await Promise.all([
        Object.keys(syncItems).length > 0 ? chrome.storage.sync.set(syncItems) : Promise.resolve(),
        Object.keys(localItems).length > 0 ? chrome.storage.local.set(localItems) : Promise.resolve()
      ]);
      return;
    }

    const isDev = typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV;
    for (const [k, v] of Object.entries(items)) {
      if (k === "apiKeys" && !isDev) {
        console.warn("Prevented saving API keys to localStorage in production.");
        continue;
      }
      localStorage.setItem(k, JSON.stringify(v));
    }
  }
};

export const storage = {
  async get<K extends StorageKey>(key: K): Promise<StorageSchema[K]> {
    const result = await storageArea.get({ [key]: defaultStorage[key] });
    return result[key] as StorageSchema[K];
  },

  async set<K extends StorageKey>(key: K, value: StorageSchema[K]): Promise<void> {
    await storageArea.set({ [key]: value });
  },

  async patch<K extends StorageKey>(
    key: K,
    value: Partial<StorageSchema[K]> | StorageSchema[K]
  ): Promise<StorageSchema[K]> {
    const current = await storage.get(key);
    const next =
      typeof current === "object" && current !== null && !Array.isArray(current)
        ? ({ ...current, ...(value as object) } as StorageSchema[K])
        : (value as StorageSchema[K]);

    await storage.set(key, next);
    return next;
  },

  async getAll(): Promise<StorageSchema> {
    const result = await storageArea.get(defaultStorage);
    return { ...defaultStorage, ...result } as StorageSchema;
  },

  async reset(): Promise<void> {
    await storageArea.set(defaultStorage);
  }
};
