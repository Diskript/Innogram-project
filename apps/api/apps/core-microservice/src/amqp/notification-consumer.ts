import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { AmqpService, AmqpMessage } from "./amqp.service";
import { WsGateway } from "../ws/ws.gateway";

const MAX_RETRIES = 3;

@Injectable()
export class NotificationConsumer implements OnModuleInit {
  private readonly logger = new Logger(NotificationConsumer.name);

  constructor(
    private readonly amqpService: AmqpService,
    private readonly wsGateway: WsGateway,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.amqpService.setupQueue(
      "notification.direct", "notification.deliver", "#", "notification.dlx",
    );
    await this.amqpService.consume("notification.deliver", async (msg) => {
      await this.handleNotification(msg);
    });
  }

  async handleNotification(msg: AmqpMessage): Promise<void> {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      this.amqpService.nack(msg, false);
      return;
    }

    const userId = payload.userId as string;
    const retryCount = (
      (msg.properties?.headers as Record<string, unknown>)?.["x-retry-count"] as number
    ) ?? 0;

    try {
      this.wsGateway.sendToUser(userId, "notification.new", payload);
      this.amqpService.ack(msg);
    } catch (error) {
      this.logger.warn(
        `WS notification delivery failed for user ${userId} (retry ${retryCount}/${MAX_RETRIES}): ${(error as Error).message}`,
      );

      if (retryCount < MAX_RETRIES) {
        const newHeaders = {
          ...(msg.properties?.headers as Record<string, unknown>),
          "x-retry-count": retryCount + 1,
        };
        (msg as any).properties = { ...msg.properties, headers: newHeaders };
        this.amqpService.nack(msg, true);
      } else {
        this.logger.warn(
          `Notification ${payload.notificationId as string} exhausted retries, discarding to DLQ`,
        );
        this.amqpService.nack(msg, false);
      }
    }
  }
}
