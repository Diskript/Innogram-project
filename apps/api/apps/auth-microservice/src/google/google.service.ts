import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { InjectRedis } from "@nestjs-modules/ioredis";
import Redis from "ioredis";
import { ParseExpirationToSeconds } from "@repo/shared-types";
import { randomUUID } from "crypto";

export interface GoogleUser {
  googleId: string;
  email: string;
  displayName: string;
  avatarUrl: string;
}

@Injectable()
export class GoogleOAuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: string;
  private readonly refreshExpiresIn: string;
  private readonly clientUrl: string;
  private readonly refreshTokenTTL: number;

  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    @InjectRedis() private redis: Redis,
  ) {
    this.jwtSecret = process.env.JWT_SECRET!;
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN!;
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN!;
    this.clientUrl = process.env.CLIENT_URL!;
    this.refreshTokenTTL = ParseExpirationToSeconds(this.refreshExpiresIn);
  }

  async handleOAuthCallback(googleUser: GoogleUser) {
    // Check if user already exists with this Google account
    const existingAccount = await this.prismaService.client.account.findFirst({
      where: {
        provider: "GOOGLE",
        providerId: googleUser.googleId,
      },
      include: { user: true },
    });

    let user;

    if (existingAccount) {
      user = existingAccount.user;
      await this.prismaService.client.account.update({
        where: { id: existingAccount.id },
        data: { last_login_at: new Date() },
      });
    } else {
      const accountWithEmail =
        await this.prismaService.client.account.findFirst({
          where: { email: googleUser.email, provider: "LOCAL" },
        });

      if (accountWithEmail) {
        await this.prismaService.client.account.create({
          data: {
            userId: accountWithEmail.userId,
            email: googleUser.email,
            passwordHash: "", // No password for OAuth users
            provider: "GOOGLE",
            providerId: googleUser.googleId,
            last_login_at: new Date(),
          },
        });
        user = await this.prismaService.client.user.findUnique({
          where: { id: accountWithEmail.userId },
        });
      } else {
        user = await this.prismaService.client.$transaction(async (prisma) => {
          const newUser = await prisma.user.create({
            data: {
              userName: googleUser.email.split("@")[0] + "_" + Date.now(),
              displayName: googleUser.displayName,
              birthday: new Date(), // Placeholder - could prompt user later
              bio: "",
              avatarUrl: googleUser.avatarUrl || "",
              isPublic: true,
            },
          });

          await prisma.account.create({
            data: {
              userId: newUser.id,
              email: googleUser.email,
              passwordHash: "", // No password for OAuth users
              provider: "GOOGLE",
              providerId: googleUser.googleId,
              last_login_at: new Date(),
            },
          });

          return newUser;
        });
      }
    }

    // Generate JWT tokens
    const tokens = await this.generateTokens(user!.id, googleUser.email);

    // Return tokens and redirect URL (controller will set cookies)
    return {
      userId: user!.id,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      redirectUrl: `${this.clientUrl}/auth/callback?success=true`,
    };
  }

  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email },
      {
        expiresIn: ParseExpirationToSeconds(this.jwtExpiresIn),
      } as JwtSignOptions,
    );

    const refreshToken = randomUUID();
    const key = `refresh-token:${userId}`;
    await this.redis.set(key, refreshToken, "EX", this.refreshTokenTTL);

    return { accessToken, refreshToken };
  }
}
