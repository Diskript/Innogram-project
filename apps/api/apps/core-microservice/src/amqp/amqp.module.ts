import { Global, Module, OnModuleInit } from "@nestjs/common";
import { AmqpService } from "./amqp.service";
import { NotificationPublisher } from "./notification-publisher";
import { NotificationConsumer } from "./notification-consumer";
import { MessagePublisher } from "./message-publisher";
import { UndeliveredHandler } from "./undelivered-handler";
import { WsModule } from "../ws/ws.module";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Global()
@Module({
  imports: [WsModule, PrismaModule, NotificationsModule],
  providers: [
    AmqpService,
    NotificationPublisher,
    NotificationConsumer,
    MessagePublisher,
    UndeliveredHandler,
  ],
  exports: [AmqpService],
})
export class AmqpModule implements OnModuleInit {
  constructor(private readonly amqpService: AmqpService) {}

  async onModuleInit(): Promise<void> {
    await this.amqpService.connect();
  }
}
