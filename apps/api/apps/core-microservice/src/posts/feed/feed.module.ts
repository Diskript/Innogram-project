import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { FollowingsModule } from "../../profile/followings/followings.module";
import { FeedService } from "./feed.service";
import { FeedController } from "./feed.controller";

@Module({
  imports: [PrismaModule, FollowingsModule],
  providers: [FeedService],
  controllers: [FeedController],
  exports: [FeedService],
})
export class FeedModule {}
