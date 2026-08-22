import { Module } from "@nestjs/common";
import { PrismaModule } from "../prisma/prisma.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { MentionsService } from "./mentions.service";

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [MentionsService],
  exports: [MentionsService],
})
export class MentionsModule {}
