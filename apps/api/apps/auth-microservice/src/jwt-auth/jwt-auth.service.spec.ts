import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { Redis } from "ioredis";
import { ConflictException, UnauthorizedException } from "@nestjs/common";
import { JwtAuthService } from "./jwt-auth.service";
import { PrismaService } from "../prisma/prisma.service";
import { SignUpDto, LoginDto, RefreshTokenDto } from "@repo/shared-types";
import * as sharedTypes from "@repo/shared-types";

jest.mock("@repo/shared-types", () => ({
  ...jest.requireActual("@repo/shared-types"),
  comparePassword: jest.fn(),
  hashingFunction: jest.fn().mockResolvedValue("$2b$10$hashedpassword"),
}));

describe("JwtAuthService", () => {
  let service: JwtAuthService;

  type MockPrismaClient = {
    user: { findUnique: jest.Mock; create: jest.Mock };
    account: {
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
    };
    $transaction: jest.Mock;
  };

  const mockPrismaClient: MockPrismaClient = {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
    account: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  // Setup $transaction mock after mockPrismaClient is defined
  mockPrismaClient.$transaction.mockImplementation((callback) =>
    callback(mockPrismaClient),
  );

  const mockRedis = {
    set: jest.fn(),
    get: jest.fn(),
    del: jest.fn(),
    scan: jest.fn(),
  };

  const mockJwtService = {
    signAsync: jest.fn().mockResolvedValue("mock-access-token"),
    verifyAsync: jest.fn().mockResolvedValue({ sub: "user-id", email: "tes" }),
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = "test-secret";
    process.env.JWT_EXPIRES_IN = "15m";
    process.env.JWT_REFRESH_EXPIRES_IN = "7d";
    process.env.CORE_SERVICE_URL = "http://localhost:3001";
    process.env.HASH_SALT = "10";

    jest.clearAllMocks();
    mockPrismaClient.$transaction.mockImplementation((callback) =>
      callback(mockPrismaClient),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        JwtAuthService,
        {
          provide: PrismaService,
          useValue: { client: mockPrismaClient },
        },
        {
          provide: JwtService,
          useValue: mockJwtService,
        },
        {
          provide: "default_IORedisModuleConnectionToken",
          useValue: mockRedis,
        },
      ],
    }).compile();

    service = module.get<JwtAuthService>(JwtAuthService);
  });

  describe("registerUser", () => {
    const signUpDto: SignUpDto = {
      email: "test@example.com",
      password: "password123",
      username: "testuser",
      displayName: "Test User",
      birthday: "1990-01-01",
      bio: "Test bio",
    };

    it("should register a new user successfully", async () => {
      mockPrismaClient.account.findFirst.mockResolvedValue(null);
      mockPrismaClient.user.findUnique.mockResolvedValue(null);
      mockPrismaClient.user.create.mockResolvedValue({
        id: "user-id",
        userName: signUpDto.username,
      });
      mockPrismaClient.account.create.mockResolvedValue({
        id: "account-id",
        email: signUpDto.email,
        userId: "user-id",
      });

      const result = await service.registerUser(signUpDto);

      expect(result).toEqual({
        message: "User registered successfully",
        userId: "user-id",
        userEmail: signUpDto.email,
      });
      expect(mockPrismaClient.account.findFirst).toHaveBeenCalledWith({
        where: { email: signUpDto.email, provider: "LOCAL" },
      });
      expect(mockPrismaClient.user.findUnique).toHaveBeenCalledWith({
        where: { userName: signUpDto.username },
      });
    });

    it("should throw ConflictException if email already exists", async () => {
      mockPrismaClient.account.findFirst.mockResolvedValue({
        id: "acc-id",
        email: signUpDto.email,
      });

      await expect(service.registerUser(signUpDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.registerUser(signUpDto)).rejects.toThrow(
        "User with this email already exists",
      );
    });

    it("should throw ConflictException if username is already taken", async () => {
      mockPrismaClient.account.findUnique.mockResolvedValue(null);
      mockPrismaClient.user.findUnique.mockResolvedValue({
        id: "user-id",
        userName: signUpDto.username,
      });

      await expect(service.registerUser(signUpDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.registerUser(signUpDto)).rejects.toThrow(
        "Username is already taken",
      );
    });
  });

  describe("authenticateUser", () => {
    const loginDto: LoginDto = {
      email: "test@example.com",
      password: "password123",
    };

    it("should authenticate user and return tokens", async () => {
      mockPrismaClient.account.findFirst.mockResolvedValue({
        id: "account-id",
        email: loginDto.email,
        userId: "user-id",
        passwordHash: "$2b$10$hashedpassword",
      });
      mockRedis.set.mockResolvedValue("OK");
      mockJwtService.signAsync.mockResolvedValue("new-access-token");

      (sharedTypes.comparePassword as jest.Mock).mockResolvedValue(true);

      const result = await service.authenticateUser(loginDto);

      expect(result).toHaveProperty("message", "Authenticated successfully");
      expect(result).toHaveProperty("userId", "user-id");
      expect(result).toHaveProperty("accessToken", "new-access-token");
      expect(result).toHaveProperty("refreshToken");
      expect(mockPrismaClient.account.findFirst).toHaveBeenCalledWith({
        where: { email: loginDto.email, provider: "LOCAL" },
      });
    });

    it("should throw ConflictException if account not found", async () => {
      mockPrismaClient.account.findFirst.mockResolvedValue(null);

      await expect(service.authenticateUser(loginDto)).rejects.toThrow(
        ConflictException,
      );
      await expect(service.authenticateUser(loginDto)).rejects.toThrow(
        "Account not found",
      );
    });

    it("should throw UnauthorizedException if password is invalid", async () => {
      mockPrismaClient.account.findFirst.mockResolvedValue({
        id: "account-id",
        email: loginDto.email,
        userId: "user-id",
        passwordHash: "$2b$10$hashedpassword",
      });
      (sharedTypes.comparePassword as jest.Mock).mockResolvedValue(false);

      await expect(service.authenticateUser(loginDto)).rejects.toThrow(
        UnauthorizedException,
      );
      await expect(service.authenticateUser(loginDto)).rejects.toThrow(
        "Invalid credentials",
      );
    });
  });

  describe("processRefreshToken", () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: "valid-refresh-token",
    };

    it("should refresh tokens successfully", async () => {
      mockRedis.scan.mockResolvedValueOnce(["0", ["refresh-token:user-id"]]);
      mockRedis.get.mockResolvedValueOnce("valid-refresh-token");
      mockRedis.get.mockResolvedValueOnce("valid-refresh-token");
      mockPrismaClient.account.findFirst.mockResolvedValue({
        userId: "user-id",
        email: "test@example.com",
      });
      mockJwtService.signAsync.mockResolvedValue("new-access-token");

      const result = await service.processRefreshToken(refreshTokenDto);

      expect(result).toHaveProperty("message", "Tokens refreshed successfully");
      expect(result).toHaveProperty("accessToken", "new-access-token");
      expect(result).toHaveProperty("refreshToken");
    });

    it("should throw UnauthorizedException if refresh token is invalid", async () => {
      mockRedis.scan.mockResolvedValue(["0", []]);
      mockRedis.get.mockResolvedValue(null);

      await expect(
        service.processRefreshToken(refreshTokenDto),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.processRefreshToken(refreshTokenDto),
      ).rejects.toThrow("Invalid or expired refresh token");
    });

    it("should revoke token and throw if token mismatch (possible theft)", async () => {
      // During scan, the tokens match so we find the user
      mockRedis.scan.mockResolvedValue(["0", ["refresh-token:user-id"]]);
      // First get is inside findUserIdByRefreshToken - return matching token
      // Second get is for verification - return different token (simulating token theft/rotation)
      mockRedis.get
        .mockResolvedValueOnce("valid-refresh-token")
        .mockResolvedValue("different-token");
      mockRedis.del.mockResolvedValue(1);

      await expect(
        service.processRefreshToken(refreshTokenDto),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.processRefreshToken(refreshTokenDto),
      ).rejects.toThrow("Invalid or expired refresh token");
      expect(mockRedis.del).toHaveBeenCalledWith("refresh-token:user-id");
    });

    it("should throw UnauthorizedException if user account not found", async () => {
      mockRedis.scan.mockResolvedValue(["0", ["refresh-token:user-id"]]);
      mockRedis.get.mockResolvedValue("valid-refresh-token");
      mockPrismaClient.account.findFirst.mockResolvedValue(null);

      await expect(
        service.processRefreshToken(refreshTokenDto),
      ).rejects.toThrow(UnauthorizedException);
      await expect(
        service.processRefreshToken(refreshTokenDto),
      ).rejects.toThrow("User account not found");
    });
  });

  describe("revokeRefreshToken", () => {
    it("should delete the refresh token for a user", async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.revokeRefreshToken("user-id");

      expect(mockRedis.del).toHaveBeenCalledWith("refresh-token:user-id");
    });
  });

  describe("revokeAllRefreshTokens", () => {
    it("should revoke all refresh tokens for a user", async () => {
      mockRedis.del.mockResolvedValue(1);

      await service.revokeAllRefreshTokens("user-id");

      expect(mockRedis.del).toHaveBeenCalledWith("refresh-token:user-id");
    });
  });

  describe("validateAccessToken", () => {
    it("should return valid true with payload for valid token", async () => {
      mockJwtService.verifyAsync.mockResolvedValue({
        sub: "user-id",
        email: "test@example.com",
      });

      const result = await service.validateAccessToken("valid-token");

      expect(result).toEqual({
        valid: true,
        payload: { sub: "user-id", email: "test@example.com" },
      });
    });

    it("should return valid false for invalid token", async () => {
      mockJwtService.verifyAsync.mockRejectedValue(new Error("Invalid token"));

      const result = await service.validateAccessToken("invalid-token");

      expect(result).toEqual({
        valid: false,
        error: "Invalid or expired access token",
      });
    });
  });

  describe("parseExpirationToSeconds", () => {
    it("should convert minutes to seconds", () => {
      // @ts-expect-error - accessing private method for testing
      const result = service.parseExpirationToSeconds("15m");
      expect(result).toBe(15 * 60);
    });

    it("should convert hours to seconds", () => {
      // @ts-expect-error - accessing private method for testing
      const result = service.parseExpirationToSeconds("1h");
      expect(result).toBe(60 * 60);
    });

    it("should convert days to seconds", () => {
      // @ts-expect-error - accessing private method for testing
      const result = service.parseExpirationToSeconds("7d");
      expect(result).toBe(7 * 24 * 60 * 60);
    });

    it("should return default 7 days for unknown unit", () => {
      // @ts-expect-error - accessing private method for testing
      const result = service.parseExpirationToSeconds("10");
      expect(result).toBe(7 * 24 * 60 * 60);
    });
  });

  describe("generateTokens", () => {
    it("should generate both access and refresh tokens", async () => {
      mockJwtService.signAsync.mockResolvedValue("generated-access-token");
      mockRedis.set.mockResolvedValue("OK");

      // Access private method for testing
      const result = await (service as any).generateTokens(
        "user-id",
        "test@example.com",
      );

      expect(result).toHaveProperty("accessToken", "generated-access-token");
      expect(result).toHaveProperty("refreshToken");
      expect(mockRedis.set).toHaveBeenCalledWith(
        expect.stringContaining("refresh-token:user-id"),
        expect.any(String),
        "EX",
        expect.any(Number),
      );
    });
  });

  describe("findUserIdByRefreshToken", () => {
    it("should return userId when token is found", async () => {
      mockRedis.scan.mockResolvedValueOnce(["0", ["refresh-token:user-123"]]);
      mockRedis.get.mockResolvedValueOnce("matching-token");

      const result = await (service as any).findUserIdByRefreshToken(
        "matching-token",
      );

      expect(result).toBe("user-123");
    });

    it("should return null when token is not found", async () => {
      mockRedis.scan.mockResolvedValueOnce(["0", []]);

      const result = await (service as any).findUserIdByRefreshToken(
        "nonexistent-token",
      );

      expect(result).toBeNull();
    });
  });
});
