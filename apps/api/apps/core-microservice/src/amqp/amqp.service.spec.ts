import { Test, TestingModule } from "@nestjs/testing";
import { AmqpService } from "./amqp.service";

describe("AmqpService", () => {
  let service: AmqpService;

  const mockConnection = {
    createChannel: jest.fn(),
    close: jest.fn(),
  };

  const mockChannel = {
    assertExchange: jest.fn(),
    assertQueue: jest.fn(),
    bindQueue: jest.fn(),
    publish: jest.fn(),
    consume: jest.fn(),
    ack: jest.fn(),
    nack: jest.fn(),
    close: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockConnection.createChannel.mockResolvedValue(mockChannel);

    const module: TestingModule = await Test.createTestingModule({
      providers: [AmqpService],
    }).compile();

    service = module.get<AmqpService>(AmqpService);
    (service as any).connection = mockConnection;
    (service as any).channel = mockChannel;
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("publish", () => {
    it("should publish to exchange with routing key", () => {
      const payload = { notificationId: "n-1", userId: "u-1" };
      service.publish("notification.direct", "u-1", payload);

      expect(mockChannel.publish).toHaveBeenCalledWith(
        "notification.direct", "u-1",
        Buffer.from(JSON.stringify(payload)),
        { persistent: true },
      );
    });
  });

  describe("setupQueue", () => {
    it("should assert exchange, queue, and bind", async () => {
      await service.setupQueue(
        "notification.direct", "notification.deliver", "#", "notification.dlx",
      );

      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        "notification.direct", "direct", { durable: true },
      );
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        "notification.deliver",
        { durable: true, deadLetterExchange: "notification.dlx" },
      );
      expect(mockChannel.bindQueue).toHaveBeenCalledWith(
        "notification.deliver", "notification.direct", "#",
      );
    });
  });

  describe("consume", () => {
    it("should register consumer on queue", async () => {
      const handler = jest.fn();
      await service.consume("notification.deliver", handler);

      expect(mockChannel.consume).toHaveBeenCalledWith(
        "notification.deliver", expect.any(Function), { noAck: false },
      );
    });
  });

  describe("ack / nack", () => {
    it("should ack a message", () => {
      const msg = { fields: { deliveryTag: 1 } };
      service.ack(msg as any);
      expect(mockChannel.ack).toHaveBeenCalledWith(msg);
    });

    it("should nack with requeue", () => {
      const msg = { fields: { deliveryTag: 1 } };
      service.nack(msg as any, true);
      expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, true);
    });

    it("should nack without requeue (DLQ)", () => {
      const msg = { fields: { deliveryTag: 1 } };
      service.nack(msg as any, false);
      expect(mockChannel.nack).toHaveBeenCalledWith(msg, false, false);
    });
  });
});
