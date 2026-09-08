import { Test, TestingModule } from "@nestjs/testing";
import { CommentsService } from "./comments.service";
import { PrismaService } from "../../prisma/prisma.service";
import { MentionsService } from "../../mentions/mentions.service";
import { NotificationsService } from "../../notifications/notifications.service";
import { NotFoundException, ForbiddenException } from "@nestjs/common";

describe("CommentsService", () => {
  let service: CommentsService;

  const mockPost = { id: "post-1" };
  const mockParentComment = {
    id: "parent-1",
    postId: "post-1",
    userId: "author-1",
    content: "Parent",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockCommentFindUnique = jest.fn();
  const mockCommentCreate = jest.fn();
  const mockCommentFindMany = jest.fn();
  const mockCommentCount = jest.fn();
  const mockCommentUpdate = jest.fn();
  const mockCommentDelete = jest.fn();
  const mockPostFindUnique = jest.fn();
  const mockCommentLikeFindUnique = jest.fn();
  const mockCommentLikeCreate = jest.fn();
  const mockCommentLikeDelete = jest.fn();
  const mockNotificationsCreate = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CommentsService,
        {
          provide: PrismaService,
          useValue: {
            client: {
              post: { findUnique: mockPostFindUnique },
              comment: {
                findUnique: mockCommentFindUnique,
                create: mockCommentCreate,
                findMany: mockCommentFindMany,
                count: mockCommentCount,
                update: mockCommentUpdate,
                delete: mockCommentDelete,
              },
              commentLike: {
                findUnique: mockCommentLikeFindUnique,
                create: mockCommentLikeCreate,
                delete: mockCommentLikeDelete,
              },
            },
          },
        },
        {
          provide: MentionsService,
          useValue: { notifyMentionedUsers: jest.fn() },
        },
        {
          provide: NotificationsService,
          useValue: { create: mockNotificationsCreate },
        },
      ],
    }).compile();

    service = module.get<CommentsService>(CommentsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    const dto = {
      postId: "post-1",
      content: "Nice post!",
    };

    it("should create a top-level comment", async () => {
      mockPostFindUnique.mockResolvedValue(mockPost);
      mockCommentCreate.mockResolvedValue({
        id: "comment-1",
        postId: "post-1",
        userId: "user-1",
        content: "Nice post!",
        parentCommentId: null,
        user: {
          id: "user-1",
          userName: "u1",
          displayName: "U1",
          avatarUrl: null,
        },
      });

      const result = await service.create("post-1", "user-1", dto);

      expect(mockPostFindUnique).toHaveBeenCalledWith({
        where: { id: "post-1" },
        select: { id: true, userId: true },
      });
      expect(mockCommentCreate).toHaveBeenCalledWith({
        data: {
          postId: "post-1",
          userId: "user-1",
          content: "Nice post!",
          parentCommentId: null,
          createdBy: "user-1",
          updatedBy: "user-1",
        },
        include: expect.any(Object),
      });
      expect(result.id).toBe("comment-1");
    });

    it("should create a nested reply", async () => {
      mockPostFindUnique.mockResolvedValue(mockPost);
      mockCommentFindUnique.mockResolvedValue(mockParentComment);
      mockCommentCreate.mockResolvedValue({
        id: "reply-1",
        parentCommentId: "parent-1",
        content: "Reply",
        user: {
          id: "user-1",
          userName: "u1",
          displayName: "U1",
          avatarUrl: null,
        },
      });

      const result = await service.create("post-1", "user-1", {
        postId: "post-1",
        content: "Reply",
        parentCommentId: "parent-1",
      });

      expect(mockCommentFindUnique).toHaveBeenCalledWith({
        where: { id: "parent-1" },
        select: { id: true, postId: true },
      });
      expect(mockCommentCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ parentCommentId: "parent-1" }),
        include: expect.any(Object),
      });
      expect(result.parentCommentId).toBe("parent-1");
    });

    it("should throw NotFoundException when post missing", async () => {
      mockPostFindUnique.mockResolvedValue(null);

      await expect(service.create("bad-id", "user-1", dto)).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException when parent comment not found", async () => {
      mockPostFindUnique.mockResolvedValue(mockPost);
      mockCommentFindUnique.mockResolvedValue(null);

      await expect(
        service.create("post-1", "user-1", {
          ...dto,
          parentCommentId: "bad-parent",
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when parent comment is on different post", async () => {
      mockPostFindUnique.mockResolvedValue(mockPost);
      mockCommentFindUnique.mockResolvedValue({
        id: "parent-1",
        postId: "other-post",
      });

      await expect(
        service.create("post-1", "user-1", {
          ...dto,
          parentCommentId: "parent-1",
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findByPost", () => {
    it("should return paginated comments with children and like counts", async () => {
      const mockComments = [
        {
          id: "c1",
          content: "First",
          user: {
            id: "u1",
            userName: "u1",
            displayName: "U1",
            avatarUrl: null,
          },
          childComments: [
            {
              id: "r1",
              content: "Reply",
              user: {
                id: "u2",
                userName: "u2",
                displayName: "U2",
                avatarUrl: null,
              },
            },
          ],
          _count: { commentLikes: 3 },
        },
      ];

      mockCommentFindMany.mockResolvedValue(mockComments);
      mockCommentCount.mockResolvedValue(1);

      const result = await service.findByPost("post-1", { skip: 0, take: 10 });

      expect(mockCommentFindMany).toHaveBeenCalledWith({
        where: { postId: "post-1", parentCommentId: null },
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
          childComments: {
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
            orderBy: { createdAt: "asc" },
          },
          _count: { select: { commentLikes: true } },
        },
        orderBy: { createdAt: "desc" },
      });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe("update", () => {
    const existingComment = {
      id: "c1",
      userId: "user-1",
      content: "Old content",
    };

    it("should update own comment", async () => {
      mockCommentFindUnique.mockResolvedValue(existingComment);
      mockCommentUpdate.mockResolvedValue({
        ...existingComment,
        content: "Updated",
        user: {
          id: "user-1",
          userName: "u1",
          displayName: "U1",
          avatarUrl: null,
        },
      });

      const result = await service.update("c1", "user-1", "Updated");

      expect(mockCommentUpdate).toHaveBeenCalledWith({
        where: { id: "c1" },
        data: {
          content: "Updated",
          updatedAt: expect.any(Date),
          updatedBy: "user-1",
        },
        include: expect.any(Object),
      });
      expect(result.content).toBe("Updated");
    });

    it("should throw NotFoundException when comment missing", async () => {
      mockCommentFindUnique.mockResolvedValue(null);

      await expect(service.update("bad-id", "user-1", "New")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when not the author", async () => {
      mockCommentFindUnique.mockResolvedValue(existingComment);

      await expect(service.update("c1", "other-user", "New")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("remove", () => {
    const existingComment = {
      id: "c1",
      userId: "user-1",
    };

    it("should delete own comment", async () => {
      mockCommentFindUnique.mockResolvedValue(existingComment);
      mockCommentDelete.mockResolvedValue(existingComment);

      const result = await service.remove("c1", "user-1");

      expect(mockCommentDelete).toHaveBeenCalledWith({
        where: { id: "c1" },
      });
      expect(result).toEqual({ action: "deleted" });
    });

    it("should throw NotFoundException when comment missing", async () => {
      mockCommentFindUnique.mockResolvedValue(null);

      await expect(service.remove("bad-id", "user-1")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw ForbiddenException when not the author", async () => {
      mockCommentFindUnique.mockResolvedValue(existingComment);

      await expect(service.remove("c1", "other-user")).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe("toggleLike", () => {
    const existingLike = { id: "like-1", commentId: "c1", userId: "user-1" };

    it("should like when no existing like", async () => {
      mockCommentFindUnique.mockResolvedValue({ id: "c1" });
      mockCommentLikeFindUnique.mockResolvedValue(null);
      mockCommentLikeCreate.mockResolvedValue({ id: "new-like" });

      const result = await service.toggleLike("c1", "user-1");

      expect(mockCommentLikeCreate).toHaveBeenCalledWith({
        data: { commentId: "c1", userId: "user-1" },
      });
      expect(result).toEqual({ action: "liked" });
    });

    it("should unlike when existing like found", async () => {
      mockCommentFindUnique.mockResolvedValue({ id: "c1" });
      mockCommentLikeFindUnique.mockResolvedValue(existingLike);
      mockCommentLikeDelete.mockResolvedValue(existingLike);

      const result = await service.toggleLike("c1", "user-1");

      expect(mockCommentLikeDelete).toHaveBeenCalledWith({
        where: { id: "like-1" },
      });
      expect(result).toEqual({ action: "unliked" });
    });
  });

  describe("create notifications", () => {
    const commentFixture = {
      id: "comment-1",
      postId: "post-1",
      userId: "user-1",
      content: "Nice post!",
      parentCommentId: null,
      user: {
        id: "user-1",
        userName: "u1",
        displayName: "U1",
        avatarUrl: null,
      },
    };

    it("should notify the post author when commenting (not self)", async () => {
      mockPostFindUnique.mockResolvedValue({
        id: "post-1",
        userId: "author-1",
      });
      mockCommentCreate.mockResolvedValue(commentFixture);

      await service.create("post-1", "user-1", {
        content: "Nice post!",
      } as any);

      expect(mockNotificationsCreate).toHaveBeenCalledWith(
        "author-1",
        "user-1",
        "COMMENT",
        "post-1",
      );
    });

    it("should NOT notify when the author comments on their own post", async () => {
      mockPostFindUnique.mockResolvedValue({
        id: "post-1",
        userId: "author-1",
      });
      mockCommentCreate.mockResolvedValue(commentFixture);

      await service.create("post-1", "author-1", {
        content: "Self note",
      } as any);

      expect(mockNotificationsCreate).not.toHaveBeenCalled();
    });
  });
});
