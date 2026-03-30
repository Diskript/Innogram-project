import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { HttpModule } from "@nestjs/axios";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [HttpModule, PrismaModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
