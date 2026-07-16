import { Test, TestingModule } from "@nestjs/testing";
import { AssetsController } from "./assets.controller";
import { AssetsService } from "./assets.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";

describe("AssetsController", () => {
  let controller: AssetsController;

  const mockAssetsService = {
    uploadAsset: jest.fn(),
    uploadMultipleAssets: jest.fn(),
    uploadConversationAsset: jest.fn(),
    uploadMultipleConversationAssets: jest.fn(),
    getAsset: jest.fn(),
    getUserAssets: jest.fn(),
    getConversationAssets: jest.fn(),
    updateAsset: jest.fn(),
    downloadAsset: jest.fn(),
    deleteAsset: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AssetsController],
      providers: [
        { provide: AssetsService, useValue: mockAssetsService },
        { provide: JwtAuthGuard, useValue: mockJwtAuthGuard },
      ],
    }).compile();

    controller = module.get<AssetsController>(AssetsController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
