import { Test, TestingModule } from "@nestjs/testing";
import { LikesService } from "./likes.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

describe("LikesService", () => {
  let service: LikesService;

  const mockPost = {
    id: "post-1",
    userId: "author-1",
    content: "Test post",
    visibility: "PUBLIC",
    archived: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockExistingLike = {
    id: "like-1",
    postId: "post-1",
    userId: "user-1",
    createdAt: new Date(),
  };

  const mockPostFindUnique = jest.fn();
  const mockPostLikeFindUnique = jest.fn();
  const mockPostLikeCreate = jest.fn();
  const mockPostLikeDelete = jest.fn();
  const mockPostLikeFindMany = jest.fn();
  const mockPostLikeCount = jest.fn();

  beforeEach(async () => {
    mockPostFindUnique.mockReset();
    mockPostLikeFindUnique.mockReset();
    mockPostLikeCreate.mockReset();
    mockPostLikeDelete.mockReset();
    mockPostLikeFindMany.mockReset();
    mockPostLikeCount.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LikesService,
        {
          provide: PrismaService,
          useValue: {
            client: {
              post: {
                findUnique: mockPostFindUnique,
              },
              postLike: {
                findUnique: mockPostLikeFindUnique,
                create: mockPostLikeCreate,
                delete: mockPostLikeDelete,
                findMany: mockPostLikeFindMany,
                count: mockPostLikeCount,
              },
            },
          },
        },
      ],
    }).compile();

    service = module.get<LikesService>(LikesService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("togglePostLike", () => {
    it("should create a like and return { action: 'liked' } when no existing like", async () => {
      mockPostFindUnique.mockResolvedValue(mockPost);
      mockPostLikeFindUnique.mockResolvedValue(null);
      mockPostLikeCreate.mockResolvedValue({ id: "new-like" });

      const result = await service.togglePostLike("user-1", "post-1");

      expect(mockPostFindUnique).toHaveBeenCalledWith({
        where: { id: "post-1" },
      });
      expect(mockPostLikeFindUnique).toHaveBeenCalledWith({
        where: {
          postId_userId: { postId: "post-1", userId: "user-1" },
        },
      });
      expect(mockPostLikeCreate).toHaveBeenCalledWith({
        data: { postId: "post-1", userId: "user-1" },
      });
      expect(result).toEqual({ action: "liked" });
    });

    it("should delete existing like and return { action: 'unliked' }", async () => {
      mockPostFindUnique.mockResolvedValue(mockPost);
      mockPostLikeFindUnique.mockResolvedValue(mockExistingLike);
      mockPostLikeDelete.mockResolvedValue(mockExistingLike);

      const result = await service.togglePostLike("user-1", "post-1");

      expect(mockPostLikeDelete).toHaveBeenCalledWith({
        where: { id: "like-1" },
      });
      expect(result).toEqual({ action: "unliked" });
    });

    it("should throw NotFoundException when post does not exist", async () => {
      mockPostFindUnique.mockResolvedValue(null);

      await expect(
        service.togglePostLike("user-1", "nonexistent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getPostLikedUsers", () => {
    it("should return paginated liked users with total", async () => {
      const mockLikes = [
        {
          id: "l1",
          postId: "post-1",
          userId: "u1",
          createdAt: new Date(),
          user: {
            id: "u1",
            userName: "user1",
            displayName: "User One",
            avatarUrl: "avatar1.jpg",
          },
        },
        {
          id: "l2",
          postId: "post-1",
          userId: "u2",
          createdAt: new Date(),
          user: {
            id: "u2",
            userName: "user2",
            displayName: "User Two",
            avatarUrl: null,
          },
        },
      ];

      mockPostLikeFindMany.mockResolvedValue(mockLikes);
      mockPostLikeCount.mockResolvedValue(2);

      const result = await service.getPostLikedUsers("post-1", {
        skip: 0,
        take: 10,
      });

      expect(mockPostLikeFindMany).toHaveBeenCalledWith({
        where: { postId: "post-1" },
        skip: 0,
        take: 10,
        include: {
          user: {
            select: {
              id: true,
              userName: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(result.data).toHaveLength(2);
      expect(result.data[0]).toEqual(mockLikes[0].user);
      expect(result.total).toBe(2);
    });
  });
});
