import { Test, TestingModule } from "@nestjs/testing";
import { AmqpService } from "./amqp.service";
import * as amqplib from "amqplib";

jest.mock("amqplib");
const amqplibConnect = amqplib.connect as jest.Mock;

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
        "notification.direct",
        "u-1",
        Buffer.from(JSON.stringify(payload)),
        { persistent: true },
      );
    });
  });

  describe("setupQueue", () => {
    it("should assert exchange, queue, and bind", async () => {
      await service.setupQueue(
        "notification.direct",
        "notification.deliver",
        "#",
        "notification.dlx",
      );

      expect(mockChannel.assertExchange).toHaveBeenCalledWith(
        "notification.direct",
        "direct",
        { durable: true },
      );
      expect(mockChannel.assertQueue).toHaveBeenCalledWith(
        "notification.deliver",
        { durable: true, deadLetterExchange: "notification.dlx" },
      );
      expect(mockChannel.bindQueue).toHaveBeenCalledWith(
        "notification.deliver",
        "notification.direct",
        "#",
      );
    });
  });

  describe("consume", () => {
    it("should register consumer on queue", async () => {
      const handler = jest.fn();
      await service.consume("notification.deliver", handler);

      expect(mockChannel.consume).toHaveBeenCalledWith(
        "notification.deliver",
        expect.any(Function),
        { noAck: false },
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

describe("AmqpService resilience", () => {
  let service: AmqpService;

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

  const makeConnection = () => ({
    createChannel: jest.fn().mockResolvedValue(mockChannel),
    close: jest.fn(),
    on: jest.fn(),
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    const module: TestingModule = await Test.createTestingModule({
      providers: [AmqpService],
    }).compile();
    service = module.get<AmqpService>(AmqpService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("retries connect until success", async () => {
    amqplibConnect
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockRejectedValueOnce(new Error("ECONNREFUSED"))
      .mockResolvedValueOnce(makeConnection());

    const promise = service.connect();
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(1_000);
    await jest.advanceTimersByTimeAsync(2_000);
    await expect(promise).resolves.toBeUndefined();
    expect((service as any).channel).toBe(mockChannel);
  });

  it("replays registered topology after reconnect on close", async () => {
    const conn = makeConnection();
    amqplibConnect
      .mockResolvedValueOnce(conn)
      .mockRejectedValueOnce(new Error("down"))
      .mockResolvedValueOnce(conn);

    const topology = jest.fn().mockResolvedValue(undefined);
    service.registerTopology(topology);

    const first = service.connect();
    await jest.advanceTimersByTimeAsync(0);
    await first;
    expect(topology).toHaveBeenCalledTimes(1);

    const closeHandler = conn.on.mock.calls.find(
      (c: unknown[]) => c[0] === "close",
    )?.[1] as () => void;
    closeHandler();

    await jest.advanceTimersByTimeAsync(1_000);
    await Promise.resolve();
    expect(topology).toHaveBeenCalledTimes(2);
  });

  it("does not reconnect when shutting down", async () => {
    const conn = makeConnection();
    amqplibConnect.mockResolvedValue(conn);

    const first = service.connect();
    await jest.advanceTimersByTimeAsync(0);
    await first;

    const destroy = service.onModuleDestroy();
    await jest.advanceTimersByTimeAsync(0);
    await destroy;

    const closeHandler = conn.on.mock.calls.find(
      (c: unknown[]) => c[0] === "close",
    )?.[1] as () => void;
    closeHandler();

    await jest.advanceTimersByTimeAsync(10_000);
    expect(amqplibConnect).toHaveBeenCalledTimes(1);
  });

  it("publish without channel warns and schedules reconnect", async () => {
    amqplibConnect.mockRejectedValue(new Error("down"));
    const warnSpy = jest
      .spyOn((service as any).logger, "warn")
      .mockImplementation(() => undefined);

    service.publish("ex", "rk", { a: 1 });

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining("channel not available"),
    );
    expect(amqplibConnect).toHaveBeenCalled();
  });
});
