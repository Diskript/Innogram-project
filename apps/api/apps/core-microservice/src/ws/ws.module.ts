import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { WsGateway } from "./ws.gateway";
import { WsAuthService } from "./ws.auth";
import { ParseExpirationToSeconds } from "@repo/shared-types";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: {
        expiresIn: ParseExpirationToSeconds(process.env.JWT_EXPIRES_IN!),
      },
    }),
  ],
  providers: [WsGateway, WsAuthService],
  exports: [WsGateway, WsAuthService],
})
export class WsModule {}
