import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { LikesService } from "./likes.service";
import { LikesController } from "./likes.controller";
import { NotificationsModule } from "../../notifications/notifications.module";

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [LikesService],
  controllers: [LikesController],
})
export class LikesModule {}
