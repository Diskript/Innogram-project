import { Module } from "@nestjs/common";
import { JwtAuthService } from "./jwt-auth.service";
import { JwtAuthController } from "./jwt-auth.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtModule } from "@nestjs/jwt";
import { RedisModule } from "@nestjs-modules/ioredis";

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: parseInt(process.env.JWT_EXPIRES_IN!) },
    }),
    RedisModule.forRoot({
      type: "single",
      url: process.env.REDIS_URL!,
    }),
  ],
  providers: [JwtAuthService],
  controllers: [JwtAuthController],
})
export class JwtAuthModule {}
