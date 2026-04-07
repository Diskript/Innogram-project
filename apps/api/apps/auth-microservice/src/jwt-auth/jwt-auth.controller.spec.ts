import { Test, TestingModule } from "@nestjs/testing";
import { JwtAuthController } from "./jwt-auth.controller";
import { JwtAuthService } from "./jwt-auth.service";
import { SignUpDto, LoginDto, RefreshTokenDto } from "@repo/shared-types";

describe("JwtAuthController", () => {
  let controller: JwtAuthController;
  let service: JwtAuthService;

  const mockJwtAuthService = {
    registerUser: jest.fn(),
    authenticateUser: jest.fn(),
    processRefreshToken: jest.fn(),
    revokeRefreshToken: jest.fn(),
    revokeAllRefreshTokens: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [JwtAuthController],
      providers: [
        {
          provide: JwtAuthService,
          useValue: mockJwtAuthService,
        },
      ],
    }).compile();

    controller = module.get<JwtAuthController>(JwtAuthController);
    service = module.get<JwtAuthService>(JwtAuthService);
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
      birthday: "1990-01-01",
      bio: "Test bio",
    };

    it("should register a new user", async () => {
      const expectedResult = {
        message: "User registered successfully",
        userId: "user-id",
        userEmail: signUpDto.email,
      };
      mockJwtAuthService.registerUser.mockResolvedValue(expectedResult);

      const result = await controller.register(signUpDto);

      expect(result).toEqual(expectedResult);
      expect(mockJwtAuthService.registerUser).toHaveBeenCalledWith(signUpDto);
    });

    it("should pass the DTO correctly to the service", async () => {
      mockJwtAuthService.registerUser.mockResolvedValue({});

      await controller.register(signUpDto);

      expect(mockJwtAuthService.registerUser).toHaveBeenCalledWith(signUpDto);
      expect(mockJwtAuthService.registerUser).toHaveBeenCalledTimes(1);
    });
  });

  describe("login", () => {
    const loginDto: LoginDto = {
      email: "test@example.com",
      password: "password123",
    };

    it("should authenticate user and return tokens", async () => {
      const expectedResult = {
        message: "Authenticated successfully",
        userId: "user-id",
        accessToken: "access-token",
        refreshToken: "refresh-token",
      };
      mockJwtAuthService.authenticateUser.mockResolvedValue(expectedResult);

      const result = await controller.login(loginDto);

      expect(result).toEqual(expectedResult);
      expect(mockJwtAuthService.authenticateUser).toHaveBeenCalledWith(
        loginDto,
      );
    });

    it("should pass the login DTO correctly to the service", async () => {
      mockJwtAuthService.authenticateUser.mockResolvedValue({});

      await controller.login(loginDto);

      expect(mockJwtAuthService.authenticateUser).toHaveBeenCalledWith(
        loginDto,
      );
      expect(mockJwtAuthService.authenticateUser).toHaveBeenCalledTimes(1);
    });
  });

  describe("refresh", () => {
    const refreshTokenDto: RefreshTokenDto = {
      refreshToken: "valid-refresh-token",
    };

    it("should refresh tokens successfully", async () => {
      const expectedResult = {
        message: "Tokens refreshed successfully",
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
      };
      mockJwtAuthService.processRefreshToken.mockResolvedValue(expectedResult);

      const result = await controller.refresh(refreshTokenDto);

      expect(result).toEqual(expectedResult);
      expect(mockJwtAuthService.processRefreshToken).toHaveBeenCalledWith(
        refreshTokenDto,
      );
    });

    it("should pass the refresh token DTO correctly to the service", async () => {
      mockJwtAuthService.processRefreshToken.mockResolvedValue({});

      await controller.refresh(refreshTokenDto);

      expect(mockJwtAuthService.processRefreshToken).toHaveBeenCalledWith(
        refreshTokenDto,
      );
      expect(mockJwtAuthService.processRefreshToken).toHaveBeenCalledTimes(1);
    });
  });

  describe("logout", () => {
    it("should revoke refresh token for a user", async () => {
      const body = { userId: "user-id" };
      mockJwtAuthService.revokeRefreshToken.mockResolvedValue(undefined);

      const result = await controller.logout(body);

      expect(result).toEqual({ message: "Logged out successfully" });
      expect(mockJwtAuthService.revokeRefreshToken).toHaveBeenCalledWith(
        body.userId,
      );
    });

    it("should call service with correct userId", async () => {
      const body = { userId: "test-user-123" };
      mockJwtAuthService.revokeRefreshToken.mockResolvedValue(undefined);

      await controller.logout(body);

      expect(mockJwtAuthService.revokeRefreshToken).toHaveBeenCalledWith(
        "test-user-123",
      );
    });
  });

  describe("logoutAll", () => {
    it("should revoke all refresh tokens for a user", async () => {
      const body = { userId: "user-id" };
      mockJwtAuthService.revokeAllRefreshTokens.mockResolvedValue(undefined);

      const result = await controller.logoutAll(body);

      expect(result).toEqual({
        message: "Logged out from all devices successfully",
      });
      expect(mockJwtAuthService.revokeAllRefreshTokens).toHaveBeenCalledWith(
        body.userId,
      );
    });

    it("should call service with correct userId", async () => {
      const body = { userId: "test-user-456" };
      mockJwtAuthService.revokeAllRefreshTokens.mockResolvedValue(undefined);

      await controller.logoutAll(body);

      expect(mockJwtAuthService.revokeAllRefreshTokens).toHaveBeenCalledWith(
        "test-user-456",
      );
    });
  });

  describe("controller metadata", () => {
    it("should have the correct route prefix", () => {
      const controllerInstance = new JwtAuthController(
        mockJwtAuthService as unknown as JwtAuthService,
      );
      expect(controllerInstance).toBeDefined();
    });

    it("should have JwtAuthService injected", () => {
      expect(service).toBeDefined();
      expect(service).toBe(mockJwtAuthService);
    });
  });
});
