interface CacheRecord<T> {
  value: T;
  expiresAt: number;
}

class RequestCache {
  private readonly cache = new Map<string, CacheRecord<unknown>>();

  get<T>(key: string): T | undefined {
    const hit = this.cache.get(key);
    if (!hit) return undefined;
    if (Date.now() > hit.expiresAt) {
      this.cache.delete(key);
      return undefined;
    }
    return hit.value as T;
  }

  set<T>(key: string, value: T, ttlMs = 120000): T {
    this.cache.set(key, { value, expiresAt: Date.now() + ttlMs });
    return value;
  }

  async getOrSet<T>(key: string, factory: () => Promise<T>, ttlMs = 120000): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== undefined) return cached;
    const value = await factory();
    return this.set(key, value, ttlMs);
  }
}

export const requestCache = new RequestCache();
