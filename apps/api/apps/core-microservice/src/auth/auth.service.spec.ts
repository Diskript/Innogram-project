import { Test, TestingModule } from "@nestjs/testing";
import { HttpService } from "@nestjs/axios";
import { AuthService } from "./auth.service";
import { HttpException, HttpStatus } from "@nestjs/common";
import { of, throwError } from "rxjs";
import { SignUpDto, LoginDto, RefreshTokenDto } from "@repo/shared-types";

describe("AuthService", () => {
  let service: AuthService;
  let httpService: HttpService;

  const mockHttpService = {
    post: jest.fn(),
  };

  beforeEach(async () => {
    process.env.AUTH_SERVICE_URL = "http://localhost:3002";

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: HttpService, useValue: mockHttpService },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
    httpService = module.get<HttpService>(HttpService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    const signUpDto: SignUpDto = {
      email: "test@example.com",
      password: "password123",
      username: "testuser",
      displayName: "Test User",
      birthday: "2000-01-01",
    };

    it("should successfully register a user", async () => {
      const expectedResponse = {
        message: "User registered successfully",
        userId: "user-123",
        userEmail: "test@example.com",
      };

      mockHttpService.post.mockReturnValue(
        of({ data: expectedResponse } as any),
      );

      const result = await service.register(signUpDto);

      expect(result).toEqual(expectedResponse);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        "http://localhost:3002/jwt-auth/register",
        signUpDto,
      );
    });

    it("should throw HttpException on registration failure", async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => ({
          response: { status: 409, data: { message: "User already exists" } },
        })),
      );

      await expect(service.register(signUpDto)).rejects.toThrow(HttpException);
    });
  });

  describe("login", () => {
    const loginDto: LoginDto = {
      email: "test@example.com",
      password: "password123",
    };

    it("should successfully login and return tokens", async () => {
      const expectedResponse = {
        message: "Authenticated successfully",
        userId: "user-123",
        accessToken: "access-token",
        refreshToken: "refresh-token",
      };

      mockHttpService.post.mockReturnValue(
        of({ data: expectedResponse } as any),
      );

      const result = await service.login(loginDto);

      expect(result).toEqual(expectedResponse);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        "http://localhost:3002/jwt-auth/login",
        loginDto,
      );
    });

    it("should throw HttpException on invalid credentials", async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => ({
          response: { status: 401, data: { message: "Invalid credentials" } },
        })),
      );

      await expect(service.login(loginDto)).rejects.toThrow(HttpException);
    });
  });

  describe("refreshTokens", () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: "refresh-token",
    };

    it("should successfully refresh tokens", async () => {
      const expectedResponse = {
        message: "Tokens refreshed successfully",
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      };

      mockHttpService.post.mockReturnValue(
        of({ data: expectedResponse } as any),
      );

      const result = await service.refreshTokens(refreshTokenDto);

      expect(result).toEqual(expectedResponse);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        "http://localhost:3002/jwt-auth/refresh",
        refreshTokenDto,
      );
    });

    it("should throw HttpException on invalid refresh token", async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => ({
          response: {
            status: 401,
            data: { message: "Invalid or expired refresh token" },
          },
        })),
      );

      await expect(service.refreshTokens(refreshTokenDto)).rejects.toThrow(
        HttpException,
      );
    });
  });

  describe("logout", () => {
    const userId = "user-123";

    it("should successfully logout", async () => {
      const expectedResponse = { message: "Logged out successfully" };

      mockHttpService.post.mockReturnValue(
        of({ data: expectedResponse } as any),
      );

      const result = await service.logout(userId);

      expect(result).toEqual(expectedResponse);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        "http://localhost:3002/jwt-auth/logout",
        { userId },
      );
    });

    it("should return default message on logout failure", async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error("Network error")),
      );

      const result = await service.logout(userId);

      expect(result).toEqual({ message: "Logged out" });
    });
  });

  describe("logoutAll", () => {
    const userId = "user-123";

    it("should successfully logout from all devices", async () => {
      const expectedResponse = {
        message: "Logged out from all devices successfully",
      };

      mockHttpService.post.mockReturnValue(
        of({ data: expectedResponse } as any),
      );

      const result = await service.logoutAll(userId);

      expect(result).toEqual(expectedResponse);
      expect(mockHttpService.post).toHaveBeenCalledWith(
        "http://localhost:3002/jwt-auth/logout-all",
        { userId },
      );
    });

    it("should return default message on logout all failure", async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error("Network error")),
      );

      const result = await service.logoutAll(userId);

      expect(result).toEqual({ message: "Logged out from all devices" });
    });
  });

  describe("validateToken", () => {
    const token = "valid-token";

    it("should return valid response for valid token", async () => {
      const expectedResponse = {
        valid: true,
        payload: { sub: "user-123", email: "test@example.com" },
      };

      mockHttpService.post.mockReturnValue(
        of({ data: expectedResponse } as any),
      );

      const result = await service.validateToken({ token });

      expect(result).toEqual(expectedResponse);
    });

    it("should return invalid response for invalid token", async () => {
      mockHttpService.post.mockReturnValue(
        throwError(() => new Error("Invalid token")),
      );

      const result = await service.validateToken({ token });

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });
  });
});
