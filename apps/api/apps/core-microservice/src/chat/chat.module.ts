import { Module } from "@nestjs/common";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";
import { PrismaModule } from "../prisma/prisma.module";
import { EventsModule } from "../events/events.module";

@Module({
  imports: [PrismaModule, EventsModule],
  controllers: [ChatController],
  providers: [ChatService],
  exports: [ChatService],
})
export class ChatModule {}
