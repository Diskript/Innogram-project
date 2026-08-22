import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WsGateway } from "./ws.gateway";
import { WsAuthService } from "./ws.auth";
import { TypingService } from "./typing.service";

@Module({
  imports: [AuthModule],
  providers: [WsGateway, WsAuthService, TypingService],
  exports: [WsGateway, WsAuthService],
})
export class WsModule {}
