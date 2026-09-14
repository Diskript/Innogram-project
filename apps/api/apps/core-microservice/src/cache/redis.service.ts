import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";

interface MemoryEntry {
  value: string;
  expiresAt: number;
}

/**
 * Cache abstraction with Redis as the primary backend and an
 * in-memory Map as the fallback. Both paths share JSON serialization
 * and per-key TTLs.
 *
 * Fallback triggers when REDIS_URL is unset or the client never
 * reaches the "ready" state (connection refused, timeout, closed).
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private readonly client: Redis | null;
  private readonly memory = new Map<string, MemoryEntry>();

  constructor() {
    const url = process.env.REDIS_URL;
    this.client = url
      ? new Redis(url, {
          lazyConnect: true,
          maxRetriesPerRequest: 1,
          retryStrategy: () => null,
        })
      : null;

    if (this.client) {
      this.client
        .connect()
        .catch((err: Error) =>
          this.logger.warn(
            `Redis unavailable, falling back to memory: ${err.message}`,
          ),
        );
      this.client.on("error", (err: Error) =>
        this.logger.warn(`Redis error: ${err.message}`),
      );
    }
  }

  private get ready(): boolean {
    return this.client?.status === "ready";
  }

  async get<T>(key: string): Promise<T | null> {
    if (this.ready) {
      const raw = await this.client!.get(key);
      return raw ? (JSON.parse(raw) as T) : null;
    }

    const entry = this.memory.get(key);
    if (!entry) {
      return null;
    }
    if (Date.now() > entry.expiresAt) {
      this.memory.delete(key);
      return null;
    }
    return JSON.parse(entry.value) as T;
  }

  async set(key: string, value: unknown, ttlSeconds: number): Promise<void> {
    const raw = JSON.stringify(value);
    if (this.ready) {
      await this.client!.set(key, raw, "EX", ttlSeconds);
      return;
    }
    this.memory.set(key, {
      value: raw,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  async del(...keys: string[]): Promise<void> {
    if (this.ready) {
      await this.client!.del(...keys);
      return;
    }
    for (const key of keys) {
      this.memory.delete(key);
    }
  }

  async delByPrefix(prefix: string): Promise<void> {
    if (this.ready) {
      const keys = await this.client!.keys(`${prefix}*`);
      if (keys.length > 0) {
        await this.client!.del(...keys);
      }
      return;
    }
    for (const key of this.memory.keys()) {
      if (key.startsWith(prefix)) {
        this.memory.delete(key);
      }
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client?.quit().catch(() => undefined);
  }
}
