import { Module } from "@nestjs/common";
import { ProfileController } from "./profile.controller";
import { ProfileService } from "./profile.service";
import { FollowingsModule } from './followings/followings.module';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService],
  imports: [FollowingsModule],
})
export class ProfileModule {}
