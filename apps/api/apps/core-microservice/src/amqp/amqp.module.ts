import { Global, Module, OnModuleInit } from "@nestjs/common";
import { AmqpService } from "./amqp.service";
import { NotificationPublisher } from "./notification-publisher";
import { NotificationConsumer } from "./notification-consumer";

@Global()
@Module({
  providers: [AmqpService, NotificationPublisher, NotificationConsumer],
  exports: [AmqpService],
})
export class AmqpModule implements OnModuleInit {
  constructor(private readonly amqpService: AmqpService) {}

  async onModuleInit(): Promise<void> {
    await this.amqpService.connect();
  }
}
