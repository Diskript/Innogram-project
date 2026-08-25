import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { AmqpService, AmqpMessage } from "./amqp.service";
import { WsGateway } from "../ws/ws.gateway";
import { EventsService } from "../events/events.service";

const MAX_RETRIES = 3;

@Injectable()
export class MessageConsumer implements OnModuleInit {
  private readonly logger = new Logger(MessageConsumer.name);

  constructor(
    private readonly amqpService: AmqpService,
    private readonly wsGateway: WsGateway,
    private readonly eventsService: EventsService,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.amqpService.setupQueue(
      "chat.direct",
      "chat.message.deliver",
      "#",
      "chat.dlx",
    );
    await this.amqpService.consume("chat.message.deliver", async (msg) => {
      await this.handleMessage(msg);
    });
  }

  async handleMessage(msg: AmqpMessage): Promise<void> {
    let payload: Record<string, unknown>;
    try {
      payload = JSON.parse(msg.content.toString());
    } catch {
      this.amqpService.nack(msg, false);
      return;
    }

    const conversationId = payload.conversationId as string;
    const retryCount =
      ((msg.properties?.headers as Record<string, unknown>)?.[
        "x-retry-count"
      ] as number) ?? 0;

    try {
      this.wsGateway.sendToConversation(conversationId, "message.new", payload);
      this.amqpService.ack(msg);
    } catch (error) {
      this.logger.warn(
        `WS delivery failed for msg in conv ${conversationId} (retry ${retryCount}/${MAX_RETRIES}): ${(error as Error).message}`,
      );

      if (retryCount < MAX_RETRIES) {
        const newHeaders = {
          ...(msg.properties?.headers as Record<string, unknown>),
          "x-retry-count": retryCount + 1,
        };
        (msg as unknown as { properties: Record<string, unknown> }).properties =
          {
            ...msg.properties,
            headers: newHeaders,
          };
        this.amqpService.nack(msg, true);
      } else {
        this.logger.warn(
          `Message ${payload.messageId as string} exhausted retries, sending to DLQ`,
        );
        this.amqpService.nack(msg, false);
        this.eventsService.emit("message.undelivered", payload);
      }
    }
  }
}
