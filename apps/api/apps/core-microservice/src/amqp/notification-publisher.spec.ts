import { Test, TestingModule } from "@nestjs/testing";
import { NotificationPublisher } from "./notification-publisher";
import { AmqpService } from "./amqp.service";
import { EventsService } from "../events/events.service";

describe("NotificationPublisher", () => {
  let publisher: NotificationPublisher;
  let amqpService: AmqpService;

  const mockAmqpService = {
    publish: jest.fn(),
  };

  const mockEventsService = {
    on: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationPublisher,
        { provide: AmqpService, useValue: mockAmqpService },
        { provide: EventsService, useValue: mockEventsService },
      ],
    }).compile();

    publisher = module.get<NotificationPublisher>(NotificationPublisher);
    amqpService = module.get<AmqpService>(AmqpService);
  });

  it("should be defined", () => {
    expect(publisher).toBeDefined();
  });

  describe("onNotificationCreated", () => {
    it("should publish to notification.direct with userId routing key", () => {
      const payload = {
        notificationId: "notif-1",
        userId: "user-2",
        actorId: "user-1",
        type: "MENTION",
        entityId: "msg-1",
      };

      publisher.onNotificationCreated(payload);

      expect(mockAmqpService.publish).toHaveBeenCalledWith(
        "notification.direct", "user-2", payload,
      );
    });
  });
});
