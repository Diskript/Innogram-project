import { Module } from "@nestjs/common";
import { CoreMicroserviceController } from "./core-microservice.controller";
import { CoreMicroserviceService } from "./core-microservice.service";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { ProfileModule } from "./profile/profile.module";
import { PostsModule } from "./posts/posts.module";
import { AssetsModule } from './assets/assets.module';
import { NotificationsModule } from './notifications/notifications.module';

@Module({
  imports: [UsersModule, AuthModule, ProfileModule, PostsModule, AssetsModule, NotificationsModule],
  controllers: [CoreMicroserviceController],
  providers: [CoreMicroserviceService],
})
export class CoreMicroserviceModule {}
