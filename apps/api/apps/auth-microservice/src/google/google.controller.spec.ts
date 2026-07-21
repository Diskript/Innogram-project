import { Test, TestingModule } from "@nestjs/testing";
import { GoogleController } from "./google.controller";
import { GoogleOAuthService } from "./google.service";

describe("GoogleController", () => {
  let controller: GoogleController;

  const mockGoogleOAuthService = {
    handleOAuthCallback: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoogleController],
      providers: [
        {
          provide: GoogleOAuthService,
          useValue: mockGoogleOAuthService,
        },
      ],
    }).compile();

    controller = module.get<GoogleController>(GoogleController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
