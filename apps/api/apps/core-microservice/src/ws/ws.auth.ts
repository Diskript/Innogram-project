import { Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";

@Injectable()
export class WsAuthService {
  constructor(private readonly jwtService: JwtService) {}

  verify(token: string): { userId: string } {
    try {
      const payload = this.jwtService.verify(token);
      const userId = payload?.sub || payload?.id || payload?.userId;
      if (!userId) {
        throw new UnauthorizedException("Invalid token payload");
      }
      return { userId };
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
  }
}
