import { Test, TestingModule } from "@nestjs/testing";
import { NotificationsController } from "./notifications.controller";
import { NotificationsService } from "./notifications.service";
import { JwtUser } from "@repo/shared-types";

describe("NotificationsController", () => {
  let controller: NotificationsController;
  let service: NotificationsService;

  const mockService = {
    findByUser: jest.fn(),
    markAsRead: jest.fn(),
    getUnreadCount: jest.fn(),
    getPreferences: jest.fn(),
    updatePreferences: jest.fn(),
    markAllAsRead: jest.fn(),
  };

  const mockUser: JwtUser = { userId: "user-1", email: "test@test.com" };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NotificationsController],
      providers: [{ provide: NotificationsService, useValue: mockService }],
    }).compile();

    controller = module.get<NotificationsController>(NotificationsController);
    service = module.get<NotificationsService>(NotificationsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("GET /notifications", () => {
    it("should call service.findByUser with userId and query", async () => {
      await controller.findAll({ skip: 0, take: 10 }, mockUser);
      expect(service.findByUser).toHaveBeenCalledWith("user-1", {
        skip: 0,
        take: 10,
      });
    });
  });

  describe("PATCH /notifications/:id/read", () => {
    it("should call service.markAsRead with notification id and userId", async () => {
      await controller.markAsRead("notif-1", mockUser);
      expect(service.markAsRead).toHaveBeenCalledWith("notif-1", "user-1");
    });
  });

  describe("GET /notifications/unread-count", () => {
    it("should call service.getUnreadCount with userId", async () => {
      await controller.getUnreadCount(mockUser);
      expect(service.getUnreadCount).toHaveBeenCalledWith("user-1");
    });
  });

  describe("GET /notifications/preferences", () => {
    it("should return preferences for the current user", async () => {
      (service.getPreferences as jest.Mock).mockResolvedValue({
        followEnabled: true,
        likeEnabled: false,
        commentEnabled: true,
        mentionEnabled: true,
      });

      const result = await controller.getPreferences(mockUser);

      expect(service.getPreferences).toHaveBeenCalledWith("user-1");
      expect(result).toEqual({
        followEnabled: true,
        likeEnabled: false,
        commentEnabled: true,
        mentionEnabled: true,
      });
    });
  });

  describe("PATCH /notifications/preferences", () => {
    it("should update preferences for the current user", async () => {
      (service.updatePreferences as jest.Mock).mockResolvedValue({
        followEnabled: false,
        likeEnabled: true,
        commentEnabled: true,
        mentionEnabled: true,
      });

      const result = await controller.updatePreferences(
        { followEnabled: false },
        mockUser,
      );

      expect(service.updatePreferences).toHaveBeenCalledWith("user-1", {
        followEnabled: false,
      });
      expect(result.followEnabled).toBe(false);
    });
  });

  describe("POST /notifications/read-all", () => {
    it("should mark all notifications read for the current user", async () => {
      (service.markAllAsRead as jest.Mock).mockResolvedValue({
        success: true,
        updated: 2,
      });

      const result = await controller.markAllAsRead(mockUser);

      expect(service.markAllAsRead).toHaveBeenCalledWith("user-1");
      expect(result).toEqual({ success: true, updated: 2 });
    });
  });
});
