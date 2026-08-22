import { Test, TestingModule } from "@nestjs/testing";
import { JwtService } from "@nestjs/jwt";
import { WsAuthService } from "./ws.auth";
import { UnauthorizedException } from "@nestjs/common";

describe("WsAuthService", () => {
  let service: WsAuthService;

  const mockJwtService = {
    verify: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsAuthService,
        { provide: JwtService, useValue: mockJwtService },
      ],
    }).compile();

    service = module.get<WsAuthService>(WsAuthService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  it("should return userId for valid token with sub", () => {
    mockJwtService.verify.mockReturnValue({ sub: "user-123" });
    expect(service.verify("valid-token")).toEqual({ userId: "user-123" });
  });

  it("should return userId for valid token with id", () => {
    mockJwtService.verify.mockReturnValue({ id: "user-456" });
    expect(service.verify("valid-token")).toEqual({ userId: "user-456" });
  });

  it("should throw for invalid token", () => {
    mockJwtService.verify.mockImplementation(() => {
      throw new Error("jwt malformed");
    });
    expect(() => service.verify("bad-token")).toThrow(UnauthorizedException);
  });

  it("should throw when payload has no userId", () => {
    mockJwtService.verify.mockReturnValue({ foo: "bar" });
    expect(() => service.verify("no-sub-token")).toThrow(UnauthorizedException);
  });
});
