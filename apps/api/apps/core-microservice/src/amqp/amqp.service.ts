import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import * as amqplib from "amqplib";
import type { ConsumeMessage, Channel, ChannelModel } from "amqplib";
import { getRabbitMqUrl, getRabbitMqConnectTimeoutMs } from "./amqp.config";
import { retryWithBackoff } from "../common/retry-with-backoff";

export interface AmqpMessage {
  content: Buffer;
  fields: { deliveryTag: number };
  properties: Record<string, unknown>;
}

@Injectable()
export class AmqpService implements OnModuleDestroy {
  private readonly logger = new Logger(AmqpService.name);
  private connection: ChannelModel | null = null;
  private channel: Channel | null = null;
  private connectPromise: Promise<void> | null = null;
  private topology: Array<() => Promise<void>> = [];
  private shuttingDown = false;
  private reconnecting = false;

  async connect(): Promise<void> {
    if (this.channel) {
      return;
    }
    if (!this.connectPromise) {
      this.connectPromise = this.doConnectWithRetry().catch((err) => {
        this.connectPromise = null;
        throw err;
      });
    }
    await this.connectPromise;
  }

  registerTopology(fn: () => Promise<void>): void {
    this.topology.push(fn);
    if (this.channel) {
      // Already connected: consumers register topology during app bootstrap,
      // after the eager connect in AmqpModule.onModuleInit — so run it now.
      void fn().catch((error: Error) =>
        this.logger.error(`RabbitMQ topology setup failed: ${error.message}`),
      );
    }
  }

  private async doConnectWithRetry(): Promise<void> {
    await retryWithBackoff(() => this.doConnect(), {
      timeoutMs: getRabbitMqConnectTimeoutMs(),
      onRetry: (attempt, delayMs, error) =>
        this.logger.warn(
          `RabbitMQ connect failed (attempt ${attempt}), retrying in ${Math.round(delayMs)}ms: ${error.message}`,
        ),
    });
  }

  private async doConnect(): Promise<void> {
    const url = getRabbitMqUrl();
    const conn = await amqplib.connect(url);
    this.connection = conn;
    conn.on("error", (error: Error) => {
      this.logger.error(`RabbitMQ connection error: ${error.message}`);
    });
    const channel = await conn.createChannel();
    channel.on("error", (error: Error) => {
      this.logger.error(`RabbitMQ channel error: ${error.message}`);
      // Channel-level errors (e.g. publish to a missing exchange) close the
      // channel server-side; recycle the connection so the close handler
      // reconnects instead of leaving the process without an error listener.
      const conn = this.connection;
      if (conn) {
        void conn.close().catch(() => undefined);
      }
    });
    this.channel = channel;
    this.logger.log("Connected to RabbitMQ");
    conn.on("close", () => {
      this.connection = null;
      this.channel = null;
      this.connectPromise = null;
      if (this.shuttingDown) {
        return;
      }
      this.logger.warn("RabbitMQ connection closed, reconnecting");
      this.scheduleReconnect();
    });
    await this.runTopology();
  }

  private async runTopology(): Promise<void> {
    for (const fn of this.topology) {
      try {
        await fn();
      } catch (error) {
        this.logger.error(
          `RabbitMQ topology setup failed: ${(error as Error).message}`,
        );
      }
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnecting || this.shuttingDown) {
      return;
    }
    this.reconnecting = true;
    this.doConnectWithRetry()
      .catch((err: Error) =>
        this.logger.error(`RabbitMQ reconnect failed: ${err.message}`),
      )
      .finally(() => {
        this.reconnecting = false;
      });
  }

  private async getReadyChannel(): Promise<Channel> {
    await this.connect();
    return this.channel!;
  }

  publish(
    exchange: string,
    routingKey: string,
    payload: Record<string, unknown>,
  ): void {
    if (!this.channel) {
      this.logger.warn("RabbitMQ channel not available, skipping publish");
      this.scheduleReconnect();
      return;
    }
    const buffer = Buffer.from(JSON.stringify(payload));
    this.channel.publish(exchange, routingKey, buffer, { persistent: true });
  }

  async setupQueue(
    exchange: string,
    queue: string,
    bindingPattern: string,
    dlxName: string,
  ): Promise<void> {
    const channel = await this.getReadyChannel();
    await channel.assertExchange(exchange, "direct", { durable: true });
    await channel.assertQueue(queue, {
      durable: true,
      deadLetterExchange: dlxName,
    });
    await channel.bindQueue(queue, exchange, bindingPattern);
  }

  async consume(
    queue: string,
    handler: (msg: AmqpMessage) => Promise<void>,
  ): Promise<void> {
    const channel = await this.getReadyChannel();
    await channel.consume(
      queue,
      async (msg) => {
        if (!msg) {
          return;
        }
        await handler(msg as unknown as AmqpMessage);
      },
      { noAck: false },
    );
  }

  ack(msg: AmqpMessage): void {
    this.channel?.ack(msg as unknown as ConsumeMessage);
  }

  nack(msg: AmqpMessage, requeue: boolean): void {
    this.channel?.nack(msg as unknown as ConsumeMessage, false, requeue);
  }

  async onModuleDestroy(): Promise<void> {
    this.shuttingDown = true;
    try {
      await this.channel?.close();
    } catch (error) {
      this.logger.warn(
        `RabbitMQ channel close failed: ${(error as Error).message}`,
      );
    }
    try {
      await this.connection?.close();
    } catch (error) {
      this.logger.warn(
        `RabbitMQ connection close failed: ${(error as Error).message}`,
      );
    }
  }
}
