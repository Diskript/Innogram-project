import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import {
  comparePassword,
  hashingFunction,
  LoginDto,
  SignUpDto,
  RefreshTokenDto,
  ParseExpirationToSeconds,
} from "@repo/shared-types";
import { PrismaService } from "../prisma/prisma.service";
import { JwtService, JwtSignOptions } from "@nestjs/jwt";
import { InjectRedis } from "@nestjs-modules/ioredis";
import { Redis } from "ioredis";
import { randomUUID } from "crypto";

export interface AuthTokensResponse {
  message: string;
  userId: string;
  accessToken: string;
  refreshToken: string;
}

export interface RefreshTokensResponse {
  message: string;
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class JwtAuthService {
  private readonly jwtSecret: string;
  private readonly jwtExpiresIn: number;
  private readonly refreshExpiresIn: string;
  private readonly coreServiceUrl: string;
  private readonly refreshTokenTTL: number; // in seconds

  constructor(
    private prismaService: PrismaService,
    private jwtService: JwtService,
    @InjectRedis() private redis: Redis,
  ) {
    this.jwtSecret = process.env.JWT_SECRET!;
    this.jwtExpiresIn = ParseExpirationToSeconds(process.env.JWT_EXPIRES_IN!);
    this.refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN!;
    this.coreServiceUrl = process.env.CORE_SERVICE_URL!;

    // Parse refresh token expiration to seconds for Redis TTL
    this.refreshTokenTTL = ParseExpirationToSeconds(this.refreshExpiresIn);
  }

  async registerUser(_signUpDto: SignUpDto) {
    const existingAccount = await this.prismaService.client.account.findUnique({
      where: { email: _signUpDto.email },
    });

    if (existingAccount) {
      throw new ConflictException("User with this email already exists");
    }

    const existingUser = await this.prismaService.client.user.findUnique({
      where: { userName: _signUpDto.username },
    });

    if (existingUser) {
      throw new ConflictException("Username is already taken");
    }

    // Hash the password
    const passwordHash = await hashingFunction(_signUpDto.password);

    // Create user and account in a transaction
    const result = await this.prismaService.client.$transaction(
      async (prisma) => {
        const user = await prisma.user.create({
          data: {
            userName: _signUpDto.username,
            displayName: _signUpDto.displayName,
            birthday: new Date(_signUpDto.birthday),
            bio: _signUpDto.bio || "",
            avatarUrl: "",
            isPublic: true,
          },
        });

        // Create the account
        const accout = await prisma.account.create({
          data: {
            userId: user.id,
            email: _signUpDto.email,
            passwordHash: passwordHash,
            provider: "LOCAL",
            providerId: user.id,
            last_login_at: new Date(),
          },
        });

        return { user, accout };
      },
    );

    return {
      message: "User registered successfully",
      userId: result.user.id,
      userEmail: result.accout.email,
    };
  }

  private async validateJWT(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.jwtSecret,
      });
      return { valid: true, user: payload };
    } catch {
      return {
        valid: false,
        error: new ConflictException("Unable to validate user"),
      };
    }
  }

  /**
   * Generate both access and refresh tokens for a user
   */
  private async generateTokens(
    userId: string,
    email: string,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
  }> {
    const accessToken = await this.jwtService.signAsync(
      { sub: userId, email },
      { expiresIn: this.jwtExpiresIn } as JwtSignOptions,
    );

    const refreshToken = randomUUID();
    const key = `refresh-token:${userId}`;
    await this.redis.set(key, refreshToken, "EX", this.refreshTokenTTL);

    return { accessToken, refreshToken };
  }

  async authenticateUser(loginDto: LoginDto): Promise<AuthTokensResponse> {
    const { email, password } = loginDto;
    const existingAccount = await this.prismaService.client.account.findUnique({
      where: { email: email },
    });

    if (!existingAccount) {
      throw new ConflictException("Account not found");
    }

    const isValidPassword = await comparePassword(
      password,
      existingAccount.passwordHash,
    );

    if (!isValidPassword) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const { accessToken, refreshToken } = await this.generateTokens(
      existingAccount.userId,
      existingAccount.email,
    );

    // Update last login
    await this.prismaService.client.account.update({
      where: { id: existingAccount.id },
      data: { last_login_at: new Date() },
    });

    return {
      message: "Authenticated successfully",
      userId: existingAccount.userId,
      accessToken,
      refreshToken,
    };
  }

  /**
   * Process refresh token and return new token pair
   * Implements token rotation - old token is invalidated, new one is issued
   */
  async processRefreshToken(
    refreshTokenDto: RefreshTokenDto,
  ): Promise<RefreshTokensResponse> {
    const { refreshToken } = refreshTokenDto;

    const userId = await this.findUserIdByRefreshToken(refreshToken);

    if (!userId) {
      throw new UnauthorizedException("Invalid or expired refresh token");
    }

    // Verify the token is still valid (not revoked)
    const storedToken = await this.redis.get(`refresh-token:${userId}`);
    if (storedToken !== refreshToken) {
      // Token mismatch - possible token theft, revoke all tokens
      await this.revokeRefreshToken(userId);
      throw new UnauthorizedException("Refresh token has been revoked");
    }

    // Get user account to include email in new tokens
    const account = await this.prismaService.client.account.findFirst({
      where: { userId },
    });

    if (!account) {
      throw new UnauthorizedException("User account not found");
    }

    // Generate new token pair (token rotation)
    const { accessToken, refreshToken: newRefreshToken } =
      await this.generateTokens(userId, account.email);

    return {
      message: "Tokens refreshed successfully",
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  /**
   * Find user ID by refresh token (scans Redis keys)
   */
  private async findUserIdByRefreshToken(
    refreshToken: string,
  ): Promise<string | null> {
    const pattern = "refresh-token:*";
    let cursor = "0";

    do {
      const result = await this.redis.scan(
        cursor,
        "MATCH",
        pattern,
        "COUNT",
        100,
      );
      cursor = result[0];
      const keys = result[1];

      for (const key of keys) {
        const token = await this.redis.get(key);
        if (token === refreshToken) {
          // Extract userId from key (format: refresh-token:userId)
          return key.split(":")[1];
        }
      }
    } while (cursor !== "0");

    return null;
  }

  /**
   * Revoke (delete) refresh token for a user
   */
  async revokeRefreshToken(userId: string): Promise<void> {
    await this.redis.del(`refresh-token:${userId}`);
  }

  /**
   * Revoke all refresh tokens for a user (logout from all devices)
   */
  async revokeAllRefreshTokens(userId: string): Promise<void> {
    await this.revokeRefreshToken(userId);
  }

  /**
   * Validate access token
   */
  async validateAccessToken(token: string) {
    try {
      const payload = await this.jwtService.verifyAsync(token, {
        secret: this.jwtSecret,
      });
      return { valid: true, payload };
    } catch {
      return { valid: false, error: "Invalid or expired access token" };
    }
  }
}
