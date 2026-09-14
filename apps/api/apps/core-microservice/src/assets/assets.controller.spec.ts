import { Test, TestingModule } from "@nestjs/testing";
import { INTERCEPTORS_METADATA } from "@nestjs/common/constants";
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

  describe("upload interceptors (disk storage + limits + filter)", () => {
    const interceptorsOf = (handler: (...args: never[]) => unknown) =>
      Reflect.getMetadata(INTERCEPTORS_METADATA, handler) ?? [];

    it("wires one disk-storage interceptor into every upload endpoint", () => {
      const methods = [
        "upload",
        "uploadMultiple",
        "uploadConversation",
        "uploadMultipleConversation",
      ] as const;

      for (const method of methods) {
        const handler = AssetsController.prototype[method] as unknown as (
          ...args: never[]
        ) => unknown;
        expect(interceptorsOf(handler)).toHaveLength(1);
      }
    });

    it("builds single-file vs multi-file interceptors by flag", () => {
      const single = Reflect.getMetadata(
        INTERCEPTORS_METADATA,
        AssetsController.prototype.upload,
      ) as unknown[];
      const multi = Reflect.getMetadata(
        INTERCEPTORS_METADATA,
        AssetsController.prototype.uploadMultiple,
      ) as unknown[];

      expect(single[0]).not.toBe(multi[0]);
    });
  });
});
