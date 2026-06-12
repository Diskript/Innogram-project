import { Module } from "@nestjs/common";
import { GoogleOAuthService } from "./google.service";
import { PassportModule } from "@nestjs/passport";
import { JwtModule } from "@nestjs/jwt";
import { PrismaModule } from "../prisma/prisma.module";
import { GoogleController } from "./google.controller";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "google" }),
    JwtModule.register({ secret: process.env.JWT_SECRET }),
    PrismaModule,
  ],
  controllers: [GoogleController],
  providers: [GoogleOAuthService],
})
export class GoogleModule {}
