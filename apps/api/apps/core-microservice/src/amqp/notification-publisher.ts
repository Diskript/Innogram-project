import { Injectable, OnModuleInit } from "@nestjs/common";
import { EventsService } from "../events/events.service";
import { AmqpService } from "./amqp.service";

@Injectable()
export class NotificationPublisher implements OnModuleInit {
  constructor(
    private readonly eventsService: EventsService,
    private readonly amqpService: AmqpService,
  ) {}

  onModuleInit(): void {
    this.eventsService.on("notification.created", (payload: unknown) => {
      this.onNotificationCreated(payload as Record<string, unknown>);
    });
  }

  onNotificationCreated(payload: Record<string, unknown>): void {
    const userId = payload.userId as string;
    this.amqpService.publish("notification.direct", userId, payload);
  }
}
