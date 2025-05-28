export class LRUCache<T> {
  private cache = new Map<string, T>();
  constructor(private capacity: number) {}

  get(key: string): T | undefined {
    if (!this.cache.has(key)) {
      return undefined;
    }

    const val = this.cache.get(key);

    this.cache.delete(key);

    if (val !== undefined) {
      this.cache.set(key, val);
    }

    return val;
  }

  put(key: string, value: T) {
    this.cache.delete(key);

    if (this.cache.size === this.capacity) {
      const leastUsed = this.cache.keys().next().value;
      if (leastUsed !== undefined) {
        this.cache.delete(leastUsed);
      }
    }
    this.cache.set(key, value);
  }
}
