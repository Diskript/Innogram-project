import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsService } from "./notifications.service";
import { PrismaService } from "../prisma/prisma.service";
import { EventsService } from "../events/events.service";
import { NotFoundException } from "@nestjs/common";

describe("NotificationsService", () => {
  let service: NotificationsService;
  let eventsService: EventsService;

  const mockCreate = jest.fn();
  const mockFindMany = jest.fn();
  const mockCount = jest.fn();
  const mockUpdateMany = jest.fn();
  const mockPrefFindUnique = jest.fn();
  const mockPrefUpsert = jest.fn();

  const mockEventsService = {
    emit: jest.fn(),
  };

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
              notificationPreference: {
                findUnique: mockPrefFindUnique,
                upsert: mockPrefUpsert,
              },
            },
          },
        },
        { provide: EventsService, useValue: mockEventsService },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
    eventsService = module.get<EventsService>(EventsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("create", () => {
    it("should create a notification and emit notification.created event", async () => {
      const created = {
        id: "notif-1",
        userId: "user-2",
        actorId: "user-1",
        type: "MENTION",
        entityId: "msg-1",
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCreate.mockResolvedValue(created);

      const result = await service.create(
        "user-2",
        "user-1",
        "MENTION",
        "msg-1",
      );

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          userId: "user-2",
          actorId: "user-1",
          type: "MENTION",
          entityId: "msg-1",
        },
      });
      expect(result).toEqual(created);
      expect(mockEventsService.emit).toHaveBeenCalledWith(
        "notification.created",
        {
          notificationId: "notif-1",
          userId: "user-2",
          actorId: "user-1",
          type: "MENTION",
          entityId: "msg-1",
        },
      );
    });

    it("should create a notification without entityId", async () => {
      const created = {
        id: "notif-2",
        userId: "user-2",
        actorId: "user-1",
        type: "FOLLOW",
        entityId: null,
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCreate.mockResolvedValue(created);

      await service.create("user-2", "user-1", "FOLLOW");

      expect(mockEventsService.emit).toHaveBeenCalledWith(
        "notification.created",
        {
          notificationId: "notif-2",
          userId: "user-2",
          actorId: "user-1",
          type: "FOLLOW",
          entityId: null,
        },
      );
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

      await expect(service.markAsRead("notif-1", "other-user")).rejects.toThrow(
        NotFoundException,
      );
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

  describe("create with preferences", () => {
    it("should skip creation when the type is disabled by preferences", async () => {
      mockPrefFindUnique.mockResolvedValue({
        userId: "user-2",
        followEnabled: false,
        likeEnabled: true,
        commentEnabled: true,
        mentionEnabled: true,
      });

      const result = await service.create("user-2", "user-1", "FOLLOW", null);

      expect(mockPrefFindUnique).toHaveBeenCalledWith({
        where: { userId: "user-2" },
      });
      expect(mockCreate).not.toHaveBeenCalled();
      expect(mockEventsService.emit).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });

    it("should create when no preference row exists (defaults all enabled)", async () => {
      mockPrefFindUnique.mockResolvedValue(null);
      const created = {
        id: "notif-3",
        userId: "user-2",
        actorId: "user-1",
        type: "LIKE",
        entityId: "post-1",
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCreate.mockResolvedValue(created);

      const result = await service.create("user-2", "user-1", "LIKE", "post-1");

      expect(mockCreate).toHaveBeenCalled();
      expect(mockEventsService.emit).toHaveBeenCalledWith(
        "notification.created",
        {
          notificationId: "notif-3",
          userId: "user-2",
          actorId: "user-1",
          type: "LIKE",
          entityId: "post-1",
        },
      );
      expect(result).toEqual(created);
    });

    it("should create for unknown types even with a preferences row", async () => {
      mockPrefFindUnique.mockResolvedValue({
        userId: "user-2",
        followEnabled: false,
        likeEnabled: false,
        commentEnabled: false,
        mentionEnabled: false,
      });
      const created = {
        id: "notif-4",
        userId: "user-2",
        actorId: "user-1",
        type: "message_undelivered",
        entityId: "msg-1",
        read: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockCreate.mockResolvedValue(created);

      const result = await service.create(
        "user-2",
        "user-1",
        "message_undelivered",
        "msg-1",
      );

      expect(mockCreate).toHaveBeenCalled();
      expect(result).toEqual(created);
    });
  });

  describe("markAllAsRead", () => {
    it("should mark all user notifications as read and return count", async () => {
      mockUpdateMany.mockResolvedValue({ count: 3 });

      const result = await service.markAllAsRead("user-1");

      expect(mockUpdateMany).toHaveBeenCalledWith({
        where: { userId: "user-1", read: false },
        data: { read: true },
      });
      expect(result).toEqual({ success: true, updated: 3 });
    });
  });

  describe("getPreferences", () => {
    it("should return stored preferences", async () => {
      mockPrefFindUnique.mockResolvedValue({
        userId: "user-1",
        followEnabled: false,
        likeEnabled: true,
        commentEnabled: true,
        mentionEnabled: false,
      });

      const result = await service.getPreferences("user-1");

      expect(result).toEqual({
        followEnabled: false,
        likeEnabled: true,
        commentEnabled: true,
        mentionEnabled: false,
      });
    });

    it("should return all-enabled defaults when no row exists", async () => {
      mockPrefFindUnique.mockResolvedValue(null);

      const result = await service.getPreferences("user-1");

      expect(result).toEqual({
        followEnabled: true,
        likeEnabled: true,
        commentEnabled: true,
        mentionEnabled: true,
      });
    });
  });

  describe("updatePreferences", () => {
    it("should upsert with provided fields", async () => {
      mockPrefUpsert.mockResolvedValue({
        userId: "user-1",
        followEnabled: false,
        likeEnabled: true,
        commentEnabled: true,
        mentionEnabled: true,
      });

      const result = await service.updatePreferences("user-1", {
        followEnabled: false,
      });

      expect(mockPrefUpsert).toHaveBeenCalledWith({
        where: { userId: "user-1" },
        create: { userId: "user-1", followEnabled: false },
        update: { followEnabled: false },
      });
      expect(result.followEnabled).toBe(false);
    });
  });
});
