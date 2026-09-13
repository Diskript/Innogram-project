import { Test, TestingModule } from "@nestjs/testing";
import { FeedService } from "./feed.service";
import { PrismaService } from "../../prisma/prisma.service";
import { FollowingsService } from "../../profile/followings/followings.service";
import { RedisService } from "../../cache/redis.service";

describe("FeedService", () => {
  let service: FeedService;

  const mockPrismaService = {
    client: {
      post: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    },
  };

  const mockFollowingsService = {
    getAcceptedFollowingIds: jest.fn(),
  };

  const mockRedisService = {
    get: jest.fn().mockResolvedValue(null),
    set: jest.fn().mockResolvedValue(undefined),
    del: jest.fn().mockResolvedValue(undefined),
    delByPrefix: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FollowingsService,
          useValue: mockFollowingsService,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<FeedService>(FeedService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should request like/comment counts and liked-by-me in the select", async () => {
    const user = { userId: "user-1", email: "a@b.c" };
    mockPrismaService.client.post.findMany.mockResolvedValue([]);
    mockPrismaService.client.post.count.mockResolvedValue(0);
    mockFollowingsService.getAcceptedFollowingIds.mockResolvedValue([]);

    await service.generateFeed(user, { take: 20 });

    const select =
      mockPrismaService.client.post.findMany.mock.calls[0][0].select;
    expect(select._count).toEqual({
      select: { postLikes: true, comments: true },
    });
    expect(select.postLikes).toEqual({
      where: { userId: "user-1" },
      select: { id: true },
    });
  });

  it("should keep pagination contract (hasMore via take+1)", async () => {
    const user = { userId: "user-1", email: "a@b.c" };
    mockPrismaService.client.post.findMany.mockResolvedValue([
      { id: "p1" },
      { id: "p2" },
    ]);
    mockPrismaService.client.post.count.mockResolvedValue(2);
    mockFollowingsService.getAcceptedFollowingIds.mockResolvedValue([]);

    const result = await service.generateFeed(user, { take: 1 });

    expect(result.data).toEqual([{ id: "p1" }]);
    expect(result.hasMore).toBe(true);
    expect(result.nextCursor).toBe("p1");
  });

  describe("cache-aside", () => {
    const user = { userId: "user-1", email: "a@b.c" };

    const feedResult = {
      data: [{ id: "p1", createdAt: new Date("2026-08-01T00:00:00Z") }],
      total: 1,
      nextCursor: null,
      hasMore: false,
    };

    it("stores the computed page with a per-user key and 60s TTL", async () => {
      mockPrismaService.client.post.findMany.mockResolvedValue(feedResult.data);
      mockPrismaService.client.post.count.mockResolvedValue(1);
      mockFollowingsService.getAcceptedFollowingIds.mockResolvedValue([]);

      await service.generateFeed(user, { take: 20 });

      expect(mockRedisService.set).toHaveBeenCalledWith(
        "feed:public:user-1:start:20",
        expect.objectContaining({ total: 1 }),
        60,
      );
    });

    it("serves a repeated identical call from cache without touching prisma", async () => {
      const first = await (async () => {
        mockPrismaService.client.post.findMany.mockResolvedValue(
          feedResult.data,
        );
        mockPrismaService.client.post.count.mockResolvedValue(1);
        mockFollowingsService.getAcceptedFollowingIds.mockResolvedValue([]);
        return service.generateFeed(user, { take: 20 });
      })();

      // Simulate the cache now holding the (JSON round-tripped) payload.
      mockRedisService.get.mockResolvedValueOnce(
        JSON.parse(JSON.stringify(first)),
      );
      const second = await service.generateFeed(user, { take: 20 });

      expect(second).toEqual(JSON.parse(JSON.stringify(first)));
      expect(mockPrismaService.client.post.findMany).toHaveBeenCalledTimes(1);
      expect(
        mockFollowingsService.getAcceptedFollowingIds,
      ).toHaveBeenCalledTimes(1);
    });
  });
});
