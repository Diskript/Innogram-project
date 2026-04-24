import { Module } from "@nestjs/common";
import { JwtAuthModule } from "./jwt-auth/jwt-auth.module";
import { GoogleModule } from "./google/google.module";

@Module({
  imports: [JwtAuthModule, GoogleModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
