import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { CommentsService } from "./comments.service";
import { CommentsController } from "./comments.controller";
import { MentionsModule } from "../../mentions/mentions.module";
import { NotificationsModule } from "../../notifications/notifications.module";

@Module({
  imports: [PrismaModule, MentionsModule, NotificationsModule],
  providers: [CommentsService],
  controllers: [CommentsController],
  exports: [CommentsService],
})
export class CommentsModule {}
