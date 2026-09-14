import Redis from "ioredis";
import { RedisService } from "./redis.service";

class MockRedisInstance {
  status = "wait";
  on = jest.fn();
  connect = jest.fn(() => Promise.resolve());
  quit = jest.fn(() => Promise.resolve());
  get = jest.fn();
  set = jest.fn();
  del = jest.fn();
  keys = jest.fn();
}

jest.mock("ioredis", () => ({
  __esModule: true,
  default: jest.fn(() => new MockRedisInstance()),
}));

const redisMock = Redis as unknown as jest.Mock<MockRedisInstance>;

const lastInstance = (): MockRedisInstance =>
  redisMock.mock.results[redisMock.mock.results.length - 1]
    .value as MockRedisInstance;

describe("RedisService", () => {
  const originalUrl = process.env.REDIS_URL;

  beforeEach(() => {
    redisMock.mockClear();
  });

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalUrl;
  });

  describe("with a ready Redis", () => {
    let service: RedisService;
    let instance: MockRedisInstance;

    beforeEach(() => {
      process.env.REDIS_URL = "redis://localhost:6379";
      service = new RedisService();
      instance = lastInstance();
      instance.status = "ready";
    });

    it("parses stored JSON on get", async () => {
      instance.get.mockResolvedValue(JSON.stringify({ a: 1 }));
      await expect(service.get<{ a: number }>("k")).resolves.toEqual({ a: 1 });
      expect(instance.get).toHaveBeenCalledWith("k");
    });

    it("returns null on cache miss", async () => {
      instance.get.mockResolvedValue(null);
      await expect(service.get("k")).resolves.toBeNull();
    });

    it("serializes with EX ttl on set", async () => {
      await service.set("k", { b: 2 }, 30);
      expect(instance.set).toHaveBeenCalledWith("k", '{"b":2}', "EX", 30);
    });

    it("forwards keys on del", async () => {
      await service.del("a", "b");
      expect(instance.del).toHaveBeenCalledWith("a", "b");
    });

    it("scans and deletes matching keys on delByPrefix", async () => {
      instance.keys.mockResolvedValue(["feed:public:x", "feed:public:y"]);
      await service.delByPrefix("feed:public:");
      expect(instance.keys).toHaveBeenCalledWith("feed:public:*");
      expect(instance.del).toHaveBeenCalledWith(
        "feed:public:x",
        "feed:public:y",
      );
    });

    it("skips del when nothing matches the prefix", async () => {
      instance.keys.mockResolvedValue([]);
      await service.delByPrefix("feed:public:");
      expect(instance.del).not.toHaveBeenCalled();
    });

    it("quits the client on module destroy", async () => {
      await service.onModuleDestroy();
      expect(instance.quit).toHaveBeenCalled();
    });
  });

  describe("with Redis configured but not ready", () => {
    let service: RedisService;
    let instance: MockRedisInstance;

    beforeEach(() => {
      process.env.REDIS_URL = "redis://localhost:6379";
      service = new RedisService();
      instance = lastInstance();
      instance.status = "end";
    });

    it("falls back to memory for get/set", async () => {
      await service.set("k", [1, 2], 10);
      await expect(service.get<number[]>("k")).resolves.toEqual([1, 2]);
      expect(instance.get).not.toHaveBeenCalled();
      expect(instance.set).not.toHaveBeenCalled();
    });

    it("falls back to memory for delByPrefix", async () => {
      await service.set("feed:public:x", 1, 10);
      await service.set("other:y", 2, 10);
      await service.delByPrefix("feed:public:");
      await expect(service.get("feed:public:x")).resolves.toBeNull();
      await expect(service.get("other:y")).resolves.toEqual(2);
      expect(instance.del).not.toHaveBeenCalled();
    });

    it("drops expired memory entries", async () => {
      jest.useFakeTimers();
      try {
        await service.set("k", "v", 1);
        jest.advanceTimersByTime(1001);
        await expect(service.get("k")).resolves.toBeNull();
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe("without REDIS_URL", () => {
    let service: RedisService;

    beforeEach(() => {
      delete process.env.REDIS_URL;
      service = new RedisService();
    });

    it("never constructs a client and serves from memory", async () => {
      expect(redisMock).not.toHaveBeenCalled();
      await service.set("k", { v: 1 }, 10);
      await expect(service.get<{ v: number }>("k")).resolves.toEqual({ v: 1 });
    });

    it("memory TTL expiry returns null", async () => {
      jest.useFakeTimers();
      try {
        await service.set("k", "v", 1);
        jest.advanceTimersByTime(1001);
        await expect(service.get("k")).resolves.toBeNull();
      } finally {
        jest.useRealTimers();
      }
    });

    it("onModuleDestroy does not throw without a client", async () => {
      await expect(service.onModuleDestroy()).resolves.toBeUndefined();
    });
  });
});
