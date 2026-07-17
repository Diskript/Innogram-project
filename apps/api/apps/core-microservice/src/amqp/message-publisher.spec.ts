import { Test, TestingModule } from "@nestjs/testing";
import { MessagePublisher } from "./message-publisher";
import { AmqpService } from "./amqp.service";
import { EventsService } from "../events/events.service";

describe("MessagePublisher", () => {
  let publisher: MessagePublisher;
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
        MessagePublisher,
        { provide: AmqpService, useValue: mockAmqpService },
        { provide: EventsService, useValue: mockEventsService },
      ],
    }).compile();

    publisher = module.get<MessagePublisher>(MessagePublisher);
    amqpService = module.get<AmqpService>(AmqpService);
  });

  it("should be defined", () => {
    expect(publisher).toBeDefined();
  });

  describe("onMessageSent", () => {
    it("should publish to chat.direct with conversation routing key", () => {
      const payload = {
        conversationId: "conv-1",
        messageId: "msg-1",
        senderId: "user-1",
      };

      publisher.onMessageSent(payload);

      expect(mockAmqpService.publish).toHaveBeenCalledWith(
        "chat.direct",
        "conv-1",
        payload,
      );
    });
  });

  describe("onMessageUpdated", () => {
    it("should publish update event", () => {
      const payload = { conversationId: "conv-1", messageId: "msg-1" };
      publisher.onMessageUpdated(payload);
      expect(mockAmqpService.publish).toHaveBeenCalledWith(
        "chat.direct",
        "conv-1",
        { event: "message.updated", ...payload },
      );
    });
  });

  describe("onMessageDeleted", () => {
    it("should publish delete event", () => {
      const payload = { conversationId: "conv-1", messageId: "msg-1" };
      publisher.onMessageDeleted(payload);
      expect(mockAmqpService.publish).toHaveBeenCalledWith(
        "chat.direct",
        "conv-1",
        { event: "message.deleted", ...payload },
      );
    });
  });
});
