import { Module } from "@nestjs/common";
import { JwtAuthModule } from './jwt-auth/jwt-auth.module';

@Module({
  imports: [JwtAuthModule],
  controllers: [],
  providers: [],
})
export class AppModule {}
