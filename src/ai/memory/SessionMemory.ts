export class SessionMemory {
  private static store = new Map<string, any>();

  static get<T>(key: string): T | undefined {
    return this.store.get(key) as T;
  }

  static set(key: string, value: any): void {
    this.store.set(key, value);
  }

  static has(key: string): boolean {
    return this.store.has(key);
  }

  static delete(key: string): void {
    this.store.delete(key);
  }

  static clear(): void {
    this.store.clear();
  }
}
