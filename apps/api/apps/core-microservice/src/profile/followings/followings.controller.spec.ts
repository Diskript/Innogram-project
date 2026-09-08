import { Test, TestingModule } from "@nestjs/testing";
import { FollowingsController } from "./followings.controller";
import { FollowingsService } from "./followings.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";

describe("FollowingsController", () => {
  let controller: FollowingsController;
  let service: FollowingsService;

  const mockFollowingsService = {
    getFollows: jest.fn(),
    getFollowers: jest.fn(),
    followUnfollow: jest.fn(),
    acceptFollowRequest: jest.fn(),
    rejectFollowRequest: jest.fn(),
    getPendingRequests: jest.fn(),
    getSentRequests: jest.fn(),
    isFollowing: jest.fn(),
    getFollowStatus: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  const mockUser = { userId: "user-1", email: "test@test.com" };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FollowingsController],
      providers: [
        { provide: FollowingsService, useValue: mockFollowingsService },
        { provide: JwtAuthGuard, useValue: mockJwtAuthGuard },
      ],
    }).compile();

    controller = module.get<FollowingsController>(FollowingsController);
    service = module.get<FollowingsService>(FollowingsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("GET /followings", () => {
    it("should call service.getFollows with current user", async () => {
      await controller.getFollows(mockUser);
      expect(service.getFollows).toHaveBeenCalledWith(mockUser);
    });
  });

  describe("GET /followings/followers", () => {
    it("should call service.getFollowers with current user", async () => {
      await controller.getFollowers(mockUser);
      expect(service.getFollowers).toHaveBeenCalledWith(mockUser);
    });
  });

  describe("POST /followings/follow/:id", () => {
    it("should call service.followUnfollow with user and target id", async () => {
      const targetId = "target-uuid";
      await controller.followUnfollow(mockUser, targetId);
      expect(service.followUnfollow).toHaveBeenCalledWith(mockUser, targetId);
    });
  });

  describe("POST /followings/requests/:userId/accept", () => {
    it("should call service.acceptFollowRequest with user and requester id", async () => {
      const requesterId = "requester-uuid";
      await controller.acceptFollowRequest(mockUser, requesterId);
      expect(service.acceptFollowRequest).toHaveBeenCalledWith(
        mockUser,
        requesterId,
      );
    });
  });

  describe("POST /followings/requests/:userId/reject", () => {
    it("should call service.rejectFollowRequest with user and requester id", async () => {
      const requesterId = "requester-uuid";
      await controller.rejectFollowRequest(mockUser, requesterId);
      expect(service.rejectFollowRequest).toHaveBeenCalledWith(
        mockUser,
        requesterId,
      );
    });
  });

  describe("GET /followings/requests/incoming", () => {
    it("should call service.getPendingRequests with current user", async () => {
      await controller.getPendingRequests(mockUser);
      expect(service.getPendingRequests).toHaveBeenCalledWith(mockUser);
    });
  });

  describe("GET /followings/requests/outgoing", () => {
    it("should call service.getSentRequests with current user", async () => {
      await controller.getSentRequests(mockUser);
      expect(service.getSentRequests).toHaveBeenCalledWith(mockUser);
    });
  });

  describe("GET /followings/check/:id", () => {
    it("should call service.getFollowStatus with user id and target id", async () => {
      const targetId = "target-uuid";
      (service.getFollowStatus as jest.Mock).mockResolvedValue("pending");

      const result = await controller.isFollowing(mockUser, targetId);

      expect(service.getFollowStatus).toHaveBeenCalledWith(
        mockUser.userId,
        targetId,
      );
      expect(result).toEqual({ status: "pending" });
    });
  });
});
