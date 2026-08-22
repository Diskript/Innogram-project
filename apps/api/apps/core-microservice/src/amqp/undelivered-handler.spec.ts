import { Test, TestingModule } from "@nestjs/testing";
import { UndeliveredHandler } from "./undelivered-handler";
import { PrismaService } from "../prisma/prisma.service";
import { EventsService } from "../events/events.service";
import { NotificationsService } from "../notifications/notifications.service";

describe("UndeliveredHandler", () => {
  let handler: UndeliveredHandler;
  let notificationsService: NotificationsService;

  const mockPrisma = {
    conversation_Participant: {
      findMany: jest.fn(),
    },
  };

  const mockEventsService = {
    on: jest.fn(),
  };

  const mockNotificationsService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UndeliveredHandler,
        { provide: PrismaService, useValue: { client: mockPrisma } },
        { provide: EventsService, useValue: mockEventsService },
        { provide: NotificationsService, useValue: mockNotificationsService },
      ],
    }).compile();

    handler = module.get<UndeliveredHandler>(UndeliveredHandler);
    notificationsService = module.get<NotificationsService>(NotificationsService);
  });

  it("should be defined", () => {
    expect(handler).toBeDefined();
  });

  describe("onUndelivered", () => {
    it("should create notifications for all participants except sender", async () => {
      mockPrisma.conversation_Participant.findMany.mockResolvedValue([
        { userId: "user-1" },
        { userId: "user-2" },
        { userId: "user-3" },
      ]);

      await handler.onUndelivered({
        conversationId: "conv-1",
        messageId: "msg-1",
        senderId: "user-1",
      });

      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        "user-2", "user-1", "message_undelivered", "msg-1",
      );
      expect(mockNotificationsService.create).toHaveBeenCalledWith(
        "user-3", "user-1", "message_undelivered", "msg-1",
      );
      expect(mockNotificationsService.create).toHaveBeenCalledTimes(2);
    });

    it("should skip if no participants found", async () => {
      mockPrisma.conversation_Participant.findMany.mockResolvedValue([]);

      await handler.onUndelivered({
        conversationId: "conv-1",
        messageId: "msg-1",
        senderId: "user-1",
      });

      expect(mockNotificationsService.create).not.toHaveBeenCalled();
    });
  });
});
