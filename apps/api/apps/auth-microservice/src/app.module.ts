import { Module } from "@nestjs/common";
import { JwtAuthModule } from "./jwt-auth/jwt-auth.module";
import { GoogleModule } from "./google/google.module";
import { PrismaModule } from "./prisma/prisma.module";

@Module({
  imports: [JwtAuthModule, GoogleModule, PrismaModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
