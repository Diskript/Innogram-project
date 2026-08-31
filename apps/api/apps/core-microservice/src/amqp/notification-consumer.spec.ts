import { Test, TestingModule } from "@nestjs/testing";
import { NotificationConsumer } from "./notification-consumer";
import { AmqpService, AmqpMessage } from "./amqp.service";
import { WsGateway } from "../ws/ws.gateway";

describe("NotificationConsumer", () => {
  let consumer: NotificationConsumer;
  let amqpService: AmqpService;
  let wsGateway: WsGateway;

  const mockAmqpService = {
    setupQueue: jest.fn(),
    consume: jest.fn(),
    ack: jest.fn(),
    nack: jest.fn(),
  };

  const mockWsGateway = {
    sendToUser: jest.fn(),
  };

  const makeMsg = (
    payload: Record<string, unknown>,
    retryCount?: number,
  ): AmqpMessage => ({
    content: Buffer.from(JSON.stringify(payload)),
    fields: { deliveryTag: 1 },
    properties: {
      headers: { "x-retry-count": retryCount ?? 0 },
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationConsumer,
        { provide: AmqpService, useValue: mockAmqpService },
        { provide: WsGateway, useValue: mockWsGateway },
      ],
    }).compile();

    consumer = module.get<NotificationConsumer>(NotificationConsumer);
    amqpService = module.get<AmqpService>(AmqpService);
    wsGateway = module.get<WsGateway>(WsGateway);
  });

  it("should be defined", () => {
    expect(consumer).toBeDefined();
  });

  describe("onApplicationBootstrap", () => {
    it("should setup queue and register consumer", async () => {
      await consumer.onApplicationBootstrap();

      expect(mockAmqpService.setupQueue).toHaveBeenCalledWith(
        "notification.direct",
        "notification.deliver",
        "#",
        "notification.dlx",
      );
      expect(mockAmqpService.consume).toHaveBeenCalledWith(
        "notification.deliver",
        expect.any(Function),
      );
    });
  });

  describe("handleNotification", () => {
    it("should ack on successful WS delivery", async () => {
      const msg = makeMsg({
        notificationId: "notif-1",
        userId: "user-2",
        type: "MENTION",
      });
      mockWsGateway.sendToUser.mockReturnValue(undefined);

      await consumer.handleNotification(msg);

      expect(mockWsGateway.sendToUser).toHaveBeenCalledWith(
        "user-2",
        "notification.new",
        {
          notificationId: "notif-1",
          userId: "user-2",
          type: "MENTION",
        },
      );
      expect(mockAmqpService.ack).toHaveBeenCalledWith(msg);
      expect(mockAmqpService.nack).not.toHaveBeenCalled();
    });

    it("should nack with requeue on WS error (retry < 3)", async () => {
      const msg = makeMsg({ notificationId: "notif-1" }, 1);
      mockWsGateway.sendToUser.mockImplementation(() => {
        throw new Error("WS failed");
      });

      await consumer.handleNotification(msg);

      expect(mockAmqpService.nack).toHaveBeenCalledWith(msg, true);
      expect(mockAmqpService.ack).not.toHaveBeenCalled();
    });

    it("should nack without requeue after 3 retries", async () => {
      const msg = makeMsg({ notificationId: "notif-1" }, 3);
      mockWsGateway.sendToUser.mockImplementation(() => {
        throw new Error("WS failed");
      });

      await consumer.handleNotification(msg);

      expect(mockAmqpService.nack).toHaveBeenCalledWith(msg, false);
    });

    it("should nack without requeue on parse error", async () => {
      const msg: AmqpMessage = {
        content: Buffer.from("invalid json"),
        fields: { deliveryTag: 1 },
        properties: { headers: {} },
      };

      await consumer.handleNotification(msg);

      expect(mockAmqpService.nack).toHaveBeenCalledWith(msg, false);
      expect(mockWsGateway.sendToUser).not.toHaveBeenCalled();
    });
  });
});
