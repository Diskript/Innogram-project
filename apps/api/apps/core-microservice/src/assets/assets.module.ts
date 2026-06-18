import { Module } from "@nestjs/common";
import { AssetsService } from "./assets.service";
import { AssetsController } from "./assets.controller";
import { FileService } from "./file.service";
import { ThumbnailService } from "./thumbnail.service";
import { AccessControlService } from "./access-control.service";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  imports: [PrismaService],
  exports: [AccessControlService, AssetsService, FileService],
  providers: [
    AssetsService,
    FileService,
    ThumbnailService,
    AccessControlService,
  ],
  controllers: [AssetsController],
})
export class AssetsModule {}
