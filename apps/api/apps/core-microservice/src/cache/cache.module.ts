import { Module } from "@nestjs/common";
import { RedisService } from "./redis.service";

/**
 * Provides the RedisService used for cache-aside reads (feed, profiles).
 *
 * The service degrades gracefully: when REDIS_URL is unset or the
 * connection fails, it transparently falls back to a per-process
 * in-memory cache with the same TTL semantics, so nothing in the
 * codebase may assume Redis is reachable (local dev without the docker
 * stack, CI, unit tests).
 *
 * Note: delByPrefix uses Redis KEYS, which is O(N) over the whole
 * keyspace. Fine at this scale; the production upgrade path is SCAN
 * with MATCH/COUNT batching.
 */
@Module({
  providers: [RedisService],
  exports: [RedisService],
})
export class CacheModule {}
