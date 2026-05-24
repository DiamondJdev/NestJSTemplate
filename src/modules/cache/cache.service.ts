import { Injectable } from "@nestjs/common";
import { Redis } from "@upstash/redis";
import { ConfigService } from "@nestjs/config";

@Injectable()
export class CacheService {
  private redis: Redis;

  constructor(private readonly configService: ConfigService) {
    this.redis = new Redis({
      url: this.configService.getOrThrow<string>("UPSTASH_REDIS_REST_URL"),
      token: this.configService.getOrThrow<string>("UPSTASH_REDIS_REST_TOKEN"),
    });
  }

  async get<T>(key: string): Promise<T | null> {
    try {
      return await this.redis.get<T>(key);
    } catch {
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSeconds?: number): Promise<void> {
    try {
      if (ttlSeconds) {
        await this.redis.set(key, value, { ex: ttlSeconds });
      } else {
        await this.redis.set(key, value);
      }
    } catch {
      // Cache failures never fail a request
    }
  }

  async del(...keys: string[]): Promise<void> {
    try {
      await this.redis.del(...keys);
    } catch {
      // Cache failures never fail a request
    }
  }

  async ping(): Promise<boolean> {
    try {
      const result = await Promise.race([
        this.redis.ping(),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("timeout")), 2000),
        ),
      ]);
      return result === "PONG";
    } catch {
      return false;
    }
  }
}
