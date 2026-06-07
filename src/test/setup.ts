import { vi } from "vitest";

const storageData = new Map<string, unknown>();

const createStorageArea = () => ({
  get: vi.fn(async (keys: string | Record<string, unknown>) => {
    if (typeof keys === "string") {
      return { [keys]: storageData.get(keys) };
    }
    return Object.fromEntries(Object.entries(keys).map(([key, fallback]) => [key, storageData.get(key) ?? fallback]));
  }),
  set: vi.fn(async (items: Record<string, unknown>) => {
    Object.entries(items).forEach(([key, value]) => storageData.set(key, value));
  })
});

Object.defineProperty(globalThis, "chrome", {
  value: {
    storage: {
      sync: createStorageArea(),
      local: createStorageArea(),
      onChanged: {
        addListener: vi.fn(),
        removeListener: vi.fn()
      }
    },
    tabs: {
      query: vi.fn(async () => [{ id: 1, url: "https://example.com/job" }]),
      sendMessage: vi.fn(async () => ({ ok: true, snapshot: { title: "Job", url: "https://example.com/job", host: "example.com", selectedText: "", description: "", content: "React TypeScript" } }))
    },
    runtime: {
      sendMessage: vi.fn(async () => ({ ok: true })),
      onMessage: {
        addListener: vi.fn()
      }
    }
  },
  writable: true
});
