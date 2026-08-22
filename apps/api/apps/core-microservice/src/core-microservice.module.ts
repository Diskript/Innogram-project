import { Module } from "@nestjs/common";
import { CoreMicroserviceController } from "./core-microservice.controller";
import { CoreMicroserviceService } from "./core-microservice.service";
import { UsersModule } from "./users/users.module";
import { AuthModule } from "./auth/auth.module";
import { ProfileModule } from "./profile/profile.module";
import { PostsModule } from "./posts/posts.module";
import { AssetsModule } from "./assets/assets.module";
import { NotificationsModule } from "./notifications/notifications.module";
import { MentionsModule } from "./mentions/mentions.module";
import { WsModule } from "./ws/ws.module";
import { EventsModule } from "./events/events.module";
import { AmqpModule } from "./amqp/amqp.module";

@Module({
  imports: [
    UsersModule,
    AuthModule,
    ProfileModule,
    PostsModule,
    AssetsModule,
    NotificationsModule,
    MentionsModule,
    WsModule,
    EventsModule,
    AmqpModule,
  ],
  controllers: [CoreMicroserviceController],
  providers: [CoreMicroserviceService],
})
export class CoreMicroserviceModule {}
