import { Module } from "@nestjs/common";
import { FollowingsService } from "./followings.service";
import { FollowingsController } from "./followings.controller";
import { PrismaModule } from "../../prisma/prisma.module";
import { NotificationsModule } from "../../notifications/notifications.module";

@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [FollowingsService],
  controllers: [FollowingsController],
  exports: [FollowingsService],
})
export class FollowingsModule {}
