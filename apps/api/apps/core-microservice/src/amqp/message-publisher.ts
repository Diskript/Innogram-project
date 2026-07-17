import { Injectable, OnModuleInit } from "@nestjs/common";
import { EventsService } from "../events/events.service";
import { AmqpService } from "./amqp.service";

@Injectable()
export class MessagePublisher implements OnModuleInit {
  constructor(
    private readonly eventsService: EventsService,
    private readonly amqpService: AmqpService,
  ) {}

  onModuleInit(): void {
    this.eventsService.on("message.sent", (payload: unknown) => {
      this.onMessageSent(payload as Record<string, unknown>);
    });
    this.eventsService.on("message.updated", (payload: unknown) => {
      this.onMessageUpdated(payload as Record<string, unknown>);
    });
    this.eventsService.on("message.deleted", (payload: unknown) => {
      this.onMessageDeleted(payload as Record<string, unknown>);
    });
  }

  onMessageSent(payload: Record<string, unknown>): void {
    this.amqpService.publish(
      "chat.direct",
      payload.conversationId as string,
      payload,
    );
  }

  onMessageUpdated(payload: Record<string, unknown>): void {
    this.amqpService.publish("chat.direct", payload.conversationId as string, {
      event: "message.updated",
      ...payload,
    });
  }

  onMessageDeleted(payload: Record<string, unknown>): void {
    this.amqpService.publish("chat.direct", payload.conversationId as string, {
      event: "message.deleted",
      ...payload,
    });
  }
}
