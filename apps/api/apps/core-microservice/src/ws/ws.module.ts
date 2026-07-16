import { Module } from "@nestjs/common";
import { AuthModule } from "../auth/auth.module";
import { WsGateway } from "./ws.gateway";
import { WsAuthService } from "./ws.auth";

@Module({
  imports: [AuthModule],
  providers: [WsGateway, WsAuthService],
  exports: [WsGateway, WsAuthService],
})
export class WsModule {}
