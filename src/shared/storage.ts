import { defaultStorage, type StorageSchema } from "./types/storage";

type StorageKey = keyof StorageSchema;
type StorageFallbacks = Partial<StorageSchema> | StorageKey;

const isExtension = typeof chrome !== "undefined" && typeof chrome.storage !== "undefined";

const storageArea = {
  async get(keys: StorageFallbacks): Promise<Partial<StorageSchema>> {
    if (isExtension) {
      return chrome.storage.sync.get(keys);
    }

    const res: Partial<StorageSchema> = {};
    if (typeof keys === "string") {
      const val = localStorage.getItem(keys);
      res[keys] = val ? JSON.parse(val) : defaultStorage[keys as StorageKey];
    } else {
      for (const [k, fallbackVal] of Object.entries(keys)) {
        const val = localStorage.getItem(k);
        res[k as StorageKey] = val ? JSON.parse(val) : fallbackVal;
      }
    }
    return res;
  },

  async set(items: Partial<StorageSchema>): Promise<void> {
    if (isExtension) {
      return chrome.storage.sync.set(items);
    }

    for (const [k, v] of Object.entries(items)) {
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
