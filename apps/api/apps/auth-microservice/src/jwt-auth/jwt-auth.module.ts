import { Module } from "@nestjs/common";
import { JwtAuthService } from "./jwt-auth.service";
import { JwtAuthController } from "./jwt-auth.controller";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  imports: [PrismaModule],
  providers: [JwtAuthService],
  controllers: [JwtAuthController],
})
export class JwtAuthModule {}
