import { Injectable } from "@nestjs/common";

/**
 * In-memory stand-in for CacheService (which wraps real Upstash Redis).
 * Used via `.overrideProvider(CacheService).useClass(FakeCacheService)` in
 * every E2E test app so the suite never makes network calls to Upstash.
 */
@Injectable()
export class FakeCacheService {
  private readonly store = new Map<string, unknown>();

  get<T>(key: string): Promise<T | null> {
    return Promise.resolve(this.store.has(key) ? (this.store.get(key) as T) : null);
  }

  set<T>(key: string, value: T, _ttlSeconds?: number): Promise<void> {
    this.store.set(key, value);
    return Promise.resolve();
  }

  del(...keys: string[]): Promise<void> {
    keys.forEach((key) => this.store.delete(key));
    return Promise.resolve();
  }

  ping(): Promise<boolean> {
    return Promise.resolve(true);
  }
}
