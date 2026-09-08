import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import * as amqplib from "amqplib";
import type { ConsumeMessage, Channel, ChannelModel } from "amqplib";
import { getRabbitMqUrl } from "./amqp.config";

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

  async connect(): Promise<void> {
    if (this.channel) {
      return;
    }
    if (!this.connectPromise) {
      this.connectPromise = this.doConnect().catch((err) => {
        this.connectPromise = null;
        throw err;
      });
    }
    await this.connectPromise;
  }

  private async doConnect(): Promise<void> {
    const url = getRabbitMqUrl();
    const conn = await amqplib.connect(url);
    this.connection = conn;
    this.channel = await conn.createChannel();
    this.logger.log("Connected to RabbitMQ");
    conn.on("close", () => {
      this.logger.warn("RabbitMQ connection closed");
      this.connection = null;
      this.channel = null;
      this.connectPromise = null;
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
    await this.channel?.close();
    await this.connection?.close();
  }
}
