import { Test, TestingModule } from "@nestjs/testing";
import { FollowingsService } from "./followings.service";
import { PrismaService } from "../../prisma/prisma.service";
import { NotificationsService } from "../../notifications/notifications.service";

describe("FollowingsService", () => {
  let service: FollowingsService;

  const mockPrismaService = {
    client: {
      user: {
        findUnique: jest.fn(),
      },
      users_Follows: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    },
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowingsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    service = module.get<FollowingsService>(FollowingsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("followUnfollow", () => {
    it("should notify the target user when following a public user", async () => {
      (mockPrismaService.client.user.findUnique as jest.Mock).mockResolvedValue(
        { id: "target-1", isPublic: true },
      );
      (
        mockPrismaService.client.users_Follows.findUnique as jest.Mock
      ).mockResolvedValue(null);

      const result = await service.followUnfollow(
        { userId: "me-1" } as any,
        "target-1",
      );

      expect(
        mockPrismaService.client.users_Follows.create,
      ).toHaveBeenCalledWith({
        data: {
          followerId: "me-1",
          followingId: "target-1",
          status: "ACCEPTED",
        },
      });
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        "target-1",
        "me-1",
        "FOLLOW",
      );
      expect(result).toEqual({ action: "followed" });
    });

    it("should NOT notify when requesting to follow a private user (request pending)", async () => {
      (mockPrismaService.client.user.findUnique as jest.Mock).mockResolvedValue(
        { id: "target-1", isPublic: false },
      );
      (
        mockPrismaService.client.users_Follows.findUnique as jest.Mock
      ).mockResolvedValue(null);

      const result = await service.followUnfollow(
        { userId: "me-1" } as any,
        "target-1",
      );

      expect(
        mockPrismaService.client.users_Follows.create,
      ).toHaveBeenCalledWith({
        data: {
          followerId: "me-1",
          followingId: "target-1",
          status: "PENDING",
        },
      });
      expect(mockNotificationsService.create).not.toHaveBeenCalled();
      expect(result).toEqual({ action: "requested" });
    });
  });

  describe("acceptFollowRequest", () => {
    it("should notify the requester on acceptance", async () => {
      (
        mockPrismaService.client.users_Follows.findUnique as jest.Mock
      ).mockResolvedValue({ id: "follow-1", status: "PENDING" });

      const result = await service.acceptFollowRequest(
        { userId: "me-1" } as any,
        "requester-1",
      );

      expect(
        mockPrismaService.client.users_Follows.update,
      ).toHaveBeenCalledWith({
        where: { id: "follow-1" },
        data: { status: "ACCEPTED" },
      });
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        "requester-1",
        "me-1",
        "FOLLOW",
      );
      expect(result).toEqual({ action: "accepted" });
    });
  });
});
