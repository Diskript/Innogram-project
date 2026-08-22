import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { CommentsService } from "./comments.service";
import { CommentsController } from "./comments.controller";
import { MentionsModule } from "../../mentions/mentions.module";

@Module({
  imports: [PrismaModule, MentionsModule],
  providers: [CommentsService],
  controllers: [CommentsController],
  exports: [CommentsService],
})
export class CommentsModule {}
