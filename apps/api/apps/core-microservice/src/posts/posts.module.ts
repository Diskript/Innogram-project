import { Module } from "@nestjs/common";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";
import { PrismaModule } from "../prisma/prisma.module";
import { FeedModule } from "./feed/feed.module";
import { ArchiveModule } from "./archive/archive.module";
import { LikesModule } from "./likes/likes.module";
import { CommentsModule } from "./comments/comments.module";
import { MentionsModule } from "../mentions/mentions.module";

@Module({
  imports: [PrismaModule, FeedModule, ArchiveModule, LikesModule, CommentsModule, MentionsModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
