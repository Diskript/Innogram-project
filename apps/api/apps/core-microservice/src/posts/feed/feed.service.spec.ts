import { Test, TestingModule } from "@nestjs/testing";
import { FeedService } from "./feed.service";
import { PrismaService } from "../../prisma/prisma.service";
import { FollowingsService } from "../../profile/followings/followings.service";

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

  beforeEach(async () => {
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
});
