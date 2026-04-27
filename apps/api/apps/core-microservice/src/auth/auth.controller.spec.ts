import { Test, TestingModule } from "@nestjs/testing";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { JwtUser } from "./jwt.strategy";
import { HttpException, HttpStatus } from "@nestjs/common";

describe("AuthController", () => {
  let controller: AuthController;
  let authService: AuthService;

  const mockAuthService = {
    register: jest.fn(),
    login: jest.fn(),
    refreshTokens: jest.fn(),
    logout: jest.fn(),
    logoutAll: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: JwtAuthGuard, useValue: mockJwtAuthGuard },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    authService = module.get<AuthService>(AuthService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("register", () => {
    it("should register a new user", async () => {
      const signUpDto = {
        email: "test@example.com",
        password: "password123",
        username: "testuser",
        displayName: "Test User",
        birthday: "2000-01-01",
      };
      const expectedResponse = {
        message: "User registered successfully",
        userId: "user-123",
        userEmail: "test@example.com",
      };

      mockAuthService.register.mockResolvedValue(expectedResponse);

      const result = await controller.register(signUpDto);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.register).toHaveBeenCalledWith(signUpDto);
    });
  });

  describe("login", () => {
    it("should login and return tokens", async () => {
      const loginDto = {
        email: "test@example.com",
        password: "password123",
      };
      const expectedResponse = {
        message: "Authenticated successfully",
        userId: "user-123",
        accessToken: "access-token",
        refreshToken: "refresh-token",
      };

      mockAuthService.login.mockResolvedValue(expectedResponse);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.login).toHaveBeenCalledWith(loginDto);
    });
  });

  describe("refresh", () => {
    it("should refresh tokens", async () => {
      const refreshTokenDto = { refreshToken: "refresh-token" };
      const expectedResponse = {
        message: "Tokens refreshed successfully",
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      };

      mockAuthService.refreshTokens.mockResolvedValue(expectedResponse);

      const result = await controller.refresh(refreshTokenDto);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.refreshTokens).toHaveBeenCalledWith(
        refreshTokenDto,
      );
    });
  });

  describe("logout", () => {
    it("should logout successfully", async () => {
      const user: JwtUser = { userId: "user-123", email: "test@example.com" };
      const expectedResponse = { message: "Logged out successfully" };

      mockAuthService.logout.mockResolvedValue(expectedResponse);

      const result = await controller.logout(user);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.logout).toHaveBeenCalledWith(user.userId);
    });

    it("should throw exception when no user is provided", async () => {
      const user: JwtUser = null as any;

      await expect(controller.logout(user)).rejects.toThrow(HttpException);
    });
  });

  describe("logoutAll", () => {
    it("should logout from all devices", async () => {
      const user: JwtUser = { userId: "user-123", email: "test@example.com" };
      const expectedResponse = {
        message: "Logged out from all devices successfully",
      };

      mockAuthService.logoutAll.mockResolvedValue(expectedResponse);

      const result = await controller.logoutAll(user);

      expect(result).toEqual(expectedResponse);
      expect(mockAuthService.logoutAll).toHaveBeenCalledWith(user.userId);
    });

    it("should throw exception when no user is provided", async () => {
      const user: JwtUser = null as any;

      await expect(controller.logoutAll(user)).rejects.toThrow(HttpException);
    });
  });
});
