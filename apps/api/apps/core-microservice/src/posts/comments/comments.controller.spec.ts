import { Test, TestingModule } from "@nestjs/testing";
import { CommentsController } from "./comments.controller";
import { CommentsService } from "./comments.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { JwtUser } from "@repo/shared-types";

describe("CommentsController", () => {
  let controller: CommentsController;
  let service: CommentsService;

  const mockCommentsService = {
    create: jest.fn(),
    findByPost: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    toggleLike: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockUser: JwtUser = { userId: "user-1", email: "test@test.com" };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CommentsController],
      providers: [
        { provide: CommentsService, useValue: mockCommentsService },
        { provide: JwtAuthGuard, useValue: mockJwtAuthGuard },
      ],
    }).compile();

    controller = module.get<CommentsController>(CommentsController);
    service = module.get<CommentsService>(CommentsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST /posts/:postId/comments", () => {
    it("should override postId from route param and call service.create", async () => {
      const postId = "post-uuid";
      const dto = { postId: "ignored", content: "Nice!", parentCommentId: "parent-uuid" };
      await controller.create(postId, dto, mockUser);
      expect(dto.postId).toBe(postId);
      expect(service.create).toHaveBeenCalledWith(postId, mockUser.userId, dto);
    });
  });

  describe("GET /posts/:postId/comments", () => {
    it("should call service.findByPost with postId and query", async () => {
      const postId = "post-uuid";
      const query = { skip: 0, take: 10 };
      await controller.findAll(postId, query);
      expect(service.findByPost).toHaveBeenCalledWith(postId, query);
    });
  });

  describe("PATCH /comments/:id", () => {
    it("should call service.update with commentId, userId, and content", async () => {
      const commentId = "comment-uuid";
      const content = "Updated content";
      await controller.update(commentId, content, mockUser);
      expect(service.update).toHaveBeenCalledWith(commentId, mockUser.userId, content);
    });
  });

  describe("DELETE /comments/:id", () => {
    it("should call service.remove with commentId and userId", async () => {
      const commentId = "comment-uuid";
      await controller.remove(commentId, mockUser);
      expect(service.remove).toHaveBeenCalledWith(commentId, mockUser.userId);
    });
  });

  describe("POST /comments/:id/like", () => {
    it("should call service.toggleLike with commentId and userId", async () => {
      const commentId = "comment-uuid";
      await controller.toggleLike(commentId, mockUser);
      expect(service.toggleLike).toHaveBeenCalledWith(commentId, mockUser.userId);
    });
  });
});
