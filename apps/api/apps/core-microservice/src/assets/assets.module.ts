import { Module } from "@nestjs/common";
import { AssetsService } from "./assets.service";
import { AssetsController } from "./assets.controller";
import { FileService } from "./file.service";
import { ThumbnailService } from "./thumbnail.service";
import { AccessControlService } from "./access-control.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
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
