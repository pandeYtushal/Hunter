export interface ProviderHealthStats {
  provider: string;
  isAvailable: boolean;
  averageLatencyMs: number;
  failureCount: number;
  successCount: number;
  totalTokens: number;
  rateLimitHits: number;
  lastSuccessfulRequestTime?: string;
  totalCostEstimate: number;
}

export interface FallbackEvent {
  timestamp: string;
  fromProvider: string;
  toProvider: string;
  reason: string;
}

const isExtension = typeof chrome !== "undefined" && typeof chrome.storage !== "undefined";

export class ProviderHealthTracker {
  private stats: Map<string, ProviderHealthStats> = new Map();
  private fallbackEvents: FallbackEvent[] = [];
  private static instance: ProviderHealthTracker;

  private constructor() {
    this.initialize();
  }

  public static getInstance(): ProviderHealthTracker {
    if (!ProviderHealthTracker.instance) {
      ProviderHealthTracker.instance = new ProviderHealthTracker();
    }
    return ProviderHealthTracker.instance;
  }

  private async initialize() {
    if (isExtension) {
      try {
        const stored = await chrome.storage.local.get(["aiHealthStats", "aiFallbackEvents"]);
        if (stored.aiHealthStats) {
          const parsed = JSON.parse(stored.aiHealthStats) as Record<string, ProviderHealthStats>;
          for (const [provider, stat] of Object.entries(parsed)) {
            this.stats.set(provider, stat);
          }
        }
        if (stored.aiFallbackEvents) {
          this.fallbackEvents = JSON.parse(stored.aiFallbackEvents) as FallbackEvent[];
        }
      } catch (err) {
        console.error("Failed to restore health tracker metrics:", err);
      }
    }
  }

  private async persist() {
    if (isExtension) {
      try {
        const statsObj: Record<string, ProviderHealthStats> = {};
        this.stats.forEach((value, key) => {
          statsObj[key] = value;
        });
        await chrome.storage.local.set({
          aiHealthStats: JSON.stringify(statsObj),
          aiFallbackEvents: JSON.stringify(this.fallbackEvents)
        });
      } catch (err) {
        console.error("Failed to persist health tracker metrics:", err);
      }
    }
  }

  private getOrCreateStats(provider: string): ProviderHealthStats {
    const pKey = provider.toLowerCase();
    let pStats = this.stats.get(pKey);
    if (!pStats) {
      pStats = {
        provider: pKey,
        isAvailable: true,
        averageLatencyMs: 0,
        failureCount: 0,
        successCount: 0,
        totalTokens: 0,
        rateLimitHits: 0,
        totalCostEstimate: 0
      };
      this.stats.set(pKey, pStats);
    }
    return pStats;
  }

  public recordSuccess(provider: string, latencyMs: number, tokens: number, cost: number) {
    const stats = this.getOrCreateStats(provider);
    stats.isAvailable = true;
    stats.successCount++;
    stats.totalTokens += tokens;
    stats.totalCostEstimate += cost;
    stats.lastSuccessfulRequestTime = new Date().toISOString();
    
    // Rolling average for latency
    stats.averageLatencyMs = stats.averageLatencyMs === 0
      ? latencyMs
      : Math.round((stats.averageLatencyMs * 4 + latencyMs) / 5);

    void this.persist();
  }

  public recordFailure(provider: string, isRateLimit: boolean = false) {
    const stats = this.getOrCreateStats(provider);
    stats.failureCount++;
    if (isRateLimit) {
      stats.rateLimitHits++;
    }
    
    // Mark unavailable if failure count recently spike
    if (stats.failureCount > 3) {
      stats.isAvailable = false;
    }
    
    void this.persist();
  }

  public recordFallback(fromProvider: string, toProvider: string, reason: string) {
    const event: FallbackEvent = {
      timestamp: new Date().toISOString(),
      fromProvider,
      toProvider,
      reason
    };
    this.fallbackEvents.push(event);
    if (this.fallbackEvents.length > 50) {
      this.fallbackEvents.shift(); // Keep last 50 events
    }
    
    void this.persist();
  }

  public getStats(provider: string): ProviderHealthStats {
    return this.getOrCreateStats(provider);
  }

  public getAllStats(): ProviderHealthStats[] {
    return Array.from(this.stats.values());
  }

  public getFallbackEvents(): FallbackEvent[] {
    return this.fallbackEvents;
  }

  public clear(): void {
    this.stats.clear();
    this.fallbackEvents = [];
    void this.persist();
  }
}

export const ProviderHealth = ProviderHealthTracker.getInstance();
