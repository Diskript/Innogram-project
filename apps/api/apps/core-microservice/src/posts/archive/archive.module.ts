import { Module } from "@nestjs/common";
import { ArchiveService } from "./archive.service";
import { ArchiveController } from "./archive.controller";
import { PrismaModule } from "../../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [ArchiveService],
  controllers: [ArchiveController],
})
export class ArchiveModule {}
