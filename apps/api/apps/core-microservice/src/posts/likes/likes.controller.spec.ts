import { Test, TestingModule } from "@nestjs/testing";
import { LikesController } from "./likes.controller";
import { LikesService } from "./likes.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { JwtUser } from "@repo/shared-types";

describe("LikesController", () => {
  let controller: LikesController;
  let service: LikesService;

  const mockLikesService = {
    togglePostLike: jest.fn(),
    getPostLikedUsers: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockUser: JwtUser = { userId: "user-1", email: "test@test.com" };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LikesController],
      providers: [
        { provide: LikesService, useValue: mockLikesService },
        { provide: JwtAuthGuard, useValue: mockJwtAuthGuard },
      ],
    }).compile();

    controller = module.get<LikesController>(LikesController);
    service = module.get<LikesService>(LikesService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("POST /posts/:postId/likes", () => {
    it("should call service.togglePostLike with userId and postId", async () => {
      const postId = "post-uuid";
      await controller.toggleLike(postId, mockUser);
      expect(service.togglePostLike).toHaveBeenCalledWith(
        mockUser.userId,
        postId,
      );
    });
  });

  describe("GET /posts/:postId/likes", () => {
    it("should call service.getPostLikedUsers with postId and query", async () => {
      const postId = "post-uuid";
      const query = { skip: 0, take: 10 };
      await controller.getLikes(postId, query);
      expect(service.getPostLikedUsers).toHaveBeenCalledWith(postId, query);
    });
  });
});
