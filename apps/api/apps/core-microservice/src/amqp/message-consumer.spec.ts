import { Test, TestingModule } from "@nestjs/testing";
import { MessageConsumer } from "./message-consumer";
import { AmqpService, AmqpMessage } from "./amqp.service";
import { WsGateway } from "../ws/ws.gateway";
import { EventsService } from "../events/events.service";

describe("MessageConsumer", () => {
  let consumer: MessageConsumer;
  let amqpService: AmqpService;
  let wsGateway: WsGateway;
  let eventsService: EventsService;

  const mockAmqpService = {
    setupQueue: jest.fn(),
    consume: jest.fn(),
    ack: jest.fn(),
    nack: jest.fn(),
  };

  const mockWsGateway = {
    sendToConversation: jest.fn(),
  };

  const mockEventsService = {
    emit: jest.fn(),
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
        MessageConsumer,
        { provide: AmqpService, useValue: mockAmqpService },
        { provide: WsGateway, useValue: mockWsGateway },
        { provide: EventsService, useValue: mockEventsService },
      ],
    }).compile();

    consumer = module.get<MessageConsumer>(MessageConsumer);
    amqpService = module.get<AmqpService>(AmqpService);
    wsGateway = module.get<WsGateway>(WsGateway);
    eventsService = module.get<EventsService>(EventsService);
  });

  it("should be defined", () => {
    expect(consumer).toBeDefined();
  });

  describe("onApplicationBootstrap", () => {
    it("should setup queue and register consumer", async () => {
      await consumer.onApplicationBootstrap();

      expect(mockAmqpService.setupQueue).toHaveBeenCalledWith(
        "chat.direct",
        "chat.message.deliver",
        "#",
        "chat.dlx",
      );
      expect(mockAmqpService.consume).toHaveBeenCalledWith(
        "chat.message.deliver",
        expect.any(Function),
      );
    });
  });

  describe("handleMessage", () => {
    it("should ack on successful WS delivery", async () => {
      const msg = makeMsg({ conversationId: "conv-1" });
      mockWsGateway.sendToConversation.mockReturnValue(undefined);

      await consumer.handleMessage(msg);

      expect(mockWsGateway.sendToConversation).toHaveBeenCalledWith(
        "conv-1",
        "message.new",
        { conversationId: "conv-1" },
      );
      expect(mockAmqpService.ack).toHaveBeenCalledWith(msg);
      expect(mockAmqpService.nack).not.toHaveBeenCalled();
    });

    it("should nack with requeue on WS error (retry < 3)", async () => {
      const msg = makeMsg({ conversationId: "conv-1" }, 1);
      mockWsGateway.sendToConversation.mockImplementation(() => {
        throw new Error("WS failed");
      });

      await consumer.handleMessage(msg);

      expect(mockAmqpService.nack).toHaveBeenCalledWith(msg, true);
      expect(mockAmqpService.ack).not.toHaveBeenCalled();
    });

    it("should nack without requeue after 3 retries and emit undelivered", async () => {
      const msg = makeMsg({ conversationId: "conv-1" }, 3);
      mockWsGateway.sendToConversation.mockImplementation(() => {
        throw new Error("WS failed");
      });

      await consumer.handleMessage(msg);

      expect(mockAmqpService.nack).toHaveBeenCalledWith(msg, false);
      expect(mockEventsService.emit).toHaveBeenCalledWith(
        "message.undelivered",
        expect.objectContaining({ conversationId: "conv-1" }),
      );
    });

    it("should nack without requeue on parse error", async () => {
      const msg: AmqpMessage = {
        content: Buffer.from("invalid json"),
        fields: { deliveryTag: 1 },
        properties: { headers: {} },
      };

      await consumer.handleMessage(msg);

      expect(mockAmqpService.nack).toHaveBeenCalledWith(msg, false);
      expect(mockWsGateway.sendToConversation).not.toHaveBeenCalled();
    });
  });
});
