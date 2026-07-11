import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

describe("NotificationsService", () => {
  let service: NotificationsService;

  const mockCreate = jest.fn();
  const mockFindMany = jest.fn();
  const mockCount = jest.fn();
  const mockUpdateMany = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        {
          provide: PrismaService,
          useValue: {
            client: {
              notification: {
                create: mockCreate,
                findMany: mockFindMany,
                count: mockCount,
                updateMany: mockUpdateMany,
              },
            },
          },
        },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a notification record", async () => {
      const expected = {
        id: "notif-1",
        userId: "user-2",
        actorId: "user-1",
        type: "LIKE",
        entityId: "post-1",
        read: false,
        createdAt: new Date(),
      };
      mockCreate.mockResolvedValue(expected);

      const result = await service.create("user-2", "user-1", "LIKE", "post-1");

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: "user-2",
          actorId: "user-1",
          type: "LIKE",
          entityId: "post-1",
        },
      });
      expect(result).toEqual(expected);
    });

    it("should create a notification without entityId", async () => {
      mockCreate.mockResolvedValue({
        id: "notif-2",
        userId: "user-2",
        actorId: "user-1",
        type: "FOLLOW",
        entityId: null,
        read: false,
        createdAt: new Date(),
      });

      await service.create("user-2", "user-1", "FOLLOW");

      expect(mockCreate).toHaveBeenCalledWith({
        data: { userId: "user-2", actorId: "user-1", type: "FOLLOW" },
      });
    });
  });

  describe("findByUser", () => {
    it("should return paginated notifications with actor included", async () => {
      const mockNotifications = [
        {
          id: "n1",
          userId: "user-1",
          actorId: "actor-1",
          type: "LIKE",
          entityId: "post-1",
          read: false,
          createdAt: new Date(),
          actor: {
            id: "actor-1",
            userName: "actor1",
            displayName: "Actor One",
            avatarUrl: null,
          },
        },
      ];

      mockFindMany.mockResolvedValue(mockNotifications);
      mockCount.mockResolvedValue(1);

      const result = await service.findByUser("user-1", {
        skip: 0,
        take: 10,
      });

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: {
              id: true,
              userName: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      });
      expect(result.data).toEqual(mockNotifications);
      expect(result.total).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(10);
    });

    it("should filter by unreadOnly when set", async () => {
      mockFindMany.mockResolvedValue([]);
      mockCount.mockResolvedValue(0);

      await service.findByUser("user-1", { unreadOnly: true });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "user-1", read: false },
        }),
      );
      expect(mockCount).toHaveBeenCalledWith({
        where: { userId: "user-1", read: false },
      });
    });
  });

  describe("markAsRead", () => {
    it("should mark notification as read and return success", async () => {
      mockUpdateMany.mockResolvedValue({ count: 1 });

      const result = await service.markAsRead("notif-1", "user-1");

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { id: "notif-1", userId: "user-1" },
        data: { read: true },
      });
      expect(result).toEqual({ success: true });
    });

    it("should throw NotFoundException when notification not found or not owned", async () => {
      mockUpdateMany.mockResolvedValue({ count: 0 });

      await expect(
        service.markAsRead("notif-1", "other-user"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getUnreadCount", () => {
    it("should return unread notification count", async () => {
      mockCount.mockResolvedValue(5);

      const result = await service.getUnreadCount("user-1");

      expect(mockCount).toHaveBeenCalledWith({
        where: { userId: "user-1", read: false },
      });
      expect(result).toEqual({ count: 5 });
    });
  });
});
