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
});
