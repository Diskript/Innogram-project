import { Test, TestingModule } from "@nestjs/testing";
import { ForbiddenException } from "@nestjs/common";
import { PostsService } from "./posts.service";
import { PrismaService } from "../prisma/prisma.service";
import { MentionsService } from "../mentions/mentions.service";
import { RedisService } from "../cache/redis.service";

describe("PostsService", () => {
  let service: PostsService;

  const mockPrismaService = {
    client: {
      post: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    },
  };

  const mockMentionsService = {
    notifyMentionedUsers: jest.fn().mockResolvedValue(undefined),
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
        PostsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: MentionsService, useValue: mockMentionsService },
        { provide: RedisService, useValue: mockRedisService },
      ],
    }).compile();

    service = module.get<PostsService>(PostsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("feed cache invalidation", () => {
    it("invalidates the feed cache on create", async () => {
      mockPrismaService.client.post.create.mockResolvedValue({ id: "p1" });

      await service.create({ content: "hi", userId: "user-1" } as never);

      expect(mockRedisService.delByPrefix).toHaveBeenCalledWith("feed:public:");
    });

    it("invalidates the feed cache on update", async () => {
      mockPrismaService.client.post.findUnique.mockResolvedValue({
        id: "p1",
        userId: "user-1",
      });
      mockPrismaService.client.post.update.mockResolvedValue({ id: "p1" });

      await service.update("p1", { content: "edited" }, "user-1");

      expect(mockRedisService.delByPrefix).toHaveBeenCalledWith("feed:public:");
    });

    it("invalidates the feed cache on remove", async () => {
      mockPrismaService.client.post.findUnique.mockResolvedValue({
        id: "p1",
        userId: "user-1",
      });
      mockPrismaService.client.post.delete.mockResolvedValue({ id: "p1" });

      await service.remove("p1", "user-1");

      expect(mockRedisService.delByPrefix).toHaveBeenCalledWith("feed:public:");
    });

    it("does not invalidate when the mutation is rejected", async () => {
      mockPrismaService.client.post.findUnique.mockResolvedValue({
        id: "p1",
        userId: "someone-else",
      });

      await expect(
        service.update("p1", { content: "hacked" }, "user-1"),
      ).rejects.toThrow(ForbiddenException);

      expect(mockRedisService.delByPrefix).not.toHaveBeenCalled();
    });
  });

  it("should include the author (creator) in search results", async () => {
    mockPrismaService.client.post.findMany.mockResolvedValue([]);
    mockPrismaService.client.post.count.mockResolvedValue(0);

    await service.search({ q: "hello", skip: 0, take: 20 });

    const args = mockPrismaService.client.post.findMany.mock.calls[0][0];
    expect(args.where).toEqual({
      visibility: "PUBLIC",
      archived: false,
      OR: [
        { content: { contains: "hello", mode: "insensitive" } },
        { tags: { hasSome: ["hello"] } },
      ],
    });
    expect(args.include.creator).toEqual({
      select: { id: true, userName: true, displayName: true, avatarUrl: true },
    });
  });
});
