import { Global, Module, OnModuleInit } from "@nestjs/common";
import { AmqpService } from "./amqp.service";

@Global()
@Module({
  providers: [AmqpService],
  exports: [AmqpService],
})
export class AmqpModule implements OnModuleInit {
  constructor(private readonly amqpService: AmqpService) {}

  async onModuleInit(): Promise<void> {
    await this.amqpService.connect();
  }
}
