import { Module } from '@nestjs/common';
import { FollowingsService } from './followings.service';
import { FollowingsController } from './followings.controller';

@Module({
  providers: [FollowingsService],
  controllers: [FollowingsController]
})
export class FollowingsModule {}
