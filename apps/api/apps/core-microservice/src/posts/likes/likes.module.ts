import { Module } from "@nestjs/common";
import { PrismaModule } from "../../prisma/prisma.module";
import { LikesService } from "./likes.service";
import { LikesController } from "./likes.controller";

@Module({
  imports: [PrismaModule],
  providers: [LikesService],
  controllers: [LikesController],
})
export class LikesModule {}
