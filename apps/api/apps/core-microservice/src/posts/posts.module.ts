import { Module } from "@nestjs/common";
import { PostsController } from "./posts.controller";
import { PostsService } from "./posts.service";
import { PrismaModule } from "../prisma/prisma.module";
import { FeedModule } from "./feed/feed.module";
import { ArchiveModule } from "./archive/archive.module";

@Module({
  imports: [PrismaModule, FeedModule, ArchiveModule],
  controllers: [PostsController],
  providers: [PostsService],
})
export class PostsModule {}
