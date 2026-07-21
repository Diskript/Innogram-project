import { Module } from "@nestjs/common";
import { JwtAuthService } from "./jwt-auth.service";
import { JwtAuthController } from "./jwt-auth.controller";
import { PrismaModule } from "../prisma/prisma.module";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { RedisModule } from "@nestjs-modules/ioredis";
import { JwtStrategy } from "./jwt.strategy";
import { JwtAuthGuard } from "./jwt-auth.guard";

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: "jwt" }),
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
  providers: [JwtAuthService, JwtStrategy, JwtAuthGuard],
  controllers: [JwtAuthController],
})
export class JwtAuthModule {}
