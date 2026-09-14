import { Test, TestingModule } from "@nestjs/testing";
import { AssetsService } from "./assets.service";
import { PrismaService } from "../prisma/prisma.service";
import { FileService } from "./file.service";
import { ThumbnailService } from "./thumbnail.service";
import { AccessControlService } from "./access-control.service";

describe("AssetsService", () => {
  let service: AssetsService;

  const mockPrismaService = {
    client: {
      asset: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      users_Follows: {
        findUnique: jest.fn(),
      },
      conversation_Participant: {
        findFirst: jest.fn(),
      },
    },
  };

  const mockFileService = {
    saveFile: jest.fn(),
    deleteFile: jest.fn(),
    getFilePath: jest.fn(),
  };

  const mockThumbnailService = {
    generateImageThumbnail: jest.fn(),
    generateVideoThumbnail: jest.fn(),
  };

  const mockAccessControlService = {
    assertCanAccess: jest.fn(),
    assertConversationAccess: jest.fn(),
    canAccessAsset: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AssetsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FileService,
          useValue: mockFileService,
        },
        {
          provide: ThumbnailService,
          useValue: mockThumbnailService,
        },
        {
          provide: AccessControlService,
          useValue: mockAccessControlService,
        },
      ],
    }).compile();

    service = module.get<AssetsService>(AssetsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("background thumbnail processing", () => {
    const file = {
      originalname: "photo.png",
      mimetype: "image/png",
      size: 100,
      path: "/staging/staged.png",
    } as unknown as Express.Multer.File;

    const user = { userId: "user-1", email: "a@b.c" };

    const dto = { visibility: "PUBLIC", tags: [] } as never;

    const assetRow = {
      id: "asset-1",
      fileName: "f.png",
      originalName: "photo.png",
      filePath: "public/users/user-1/original/f.png",
      fileType: "image/png",
      fileSize: 100,
      processingStatus: "PENDING",
      visibility: "PUBLIC",
    };

    it("persists PENDING, responds immediately, and defers thumbnail work", async () => {
      jest.useFakeTimers();
      try {
        mockFileService.saveFile.mockResolvedValue({
          fileType: "image/png",
          filePath: assetRow.filePath,
          fileName: "f.png",
        });
        // Thumbnail work that would take "forever" if awaited.
        mockThumbnailService.generateImageThumbnail.mockReturnValue(
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  thumbnailPath: "t.png",
                  mediumPath: "m.png",
                  width: 10,
                  height: 20,
                }),
              1000,
            ),
          ),
        );
        mockPrismaService.client.asset.create.mockResolvedValue(assetRow);

        const response = await service.uploadAsset(file, user, dto);

        // Row persisted as PENDING with no thumbnail data yet.
        expect(mockPrismaService.client.asset.create).toHaveBeenCalledWith({
          data: expect.objectContaining({
            processingStatus: "PENDING",
            thumbnailPath: null,
            mediumPath: null,
          }),
        });
        // The upload response resolves without waiting on thumbnails.
        expect(response).toMatchObject({ id: "asset-1" });
        // Deferral: nothing processed yet (the immediate hasn't fired).
        expect(mockPrismaService.client.asset.update).not.toHaveBeenCalled();

        await jest.runAllTimersAsync();

        // Only after flushing the event loop does processing run.
        expect(mockThumbnailService.generateImageThumbnail).toHaveBeenCalled();
        expect(mockPrismaService.client.asset.update).toHaveBeenCalledWith({
          where: { id: "asset-1" },
          data: expect.objectContaining({ processingStatus: "READY" }),
        });
      } finally {
        await jest.runAllTimersAsync();
        jest.useRealTimers();
      }
    });

    it("marks the row READY with thumbnail data once processing completes", async () => {
      jest.useFakeTimers();
      try {
        mockFileService.saveFile.mockResolvedValue({
          fileType: "image/png",
          filePath: assetRow.filePath,
          fileName: "f.png",
        });
        mockThumbnailService.generateImageThumbnail.mockResolvedValue({
          thumbnailPath: "t.png",
          mediumPath: "m.png",
          width: 10,
          height: 20,
        });
        mockPrismaService.client.asset.create.mockResolvedValue(assetRow);

        await service.uploadAsset(file, user, dto);
        await jest.runAllTimersAsync();

        expect(mockPrismaService.client.asset.update).toHaveBeenCalledWith({
          where: { id: "asset-1" },
          data: expect.objectContaining({
            thumbnailPath: "t.png",
            mediumPath: "m.png",
            width: 10,
            height: 20,
            processingStatus: "READY",
          }),
        });
      } finally {
        jest.useRealTimers();
      }
    });

    it("marks the row FAILED and logs when thumbnail generation throws", async () => {
      jest.useFakeTimers();
      try {
        mockFileService.saveFile.mockResolvedValue({
          fileType: "image/png",
          filePath: assetRow.filePath,
          fileName: "f.png",
        });
        mockThumbnailService.generateImageThumbnail.mockRejectedValue(
          new Error("boom"),
        );
        mockPrismaService.client.asset.create.mockResolvedValue(assetRow);

        await service.uploadAsset(file, user, dto);
        await jest.runAllTimersAsync();

        expect(mockPrismaService.client.asset.update).toHaveBeenCalledWith({
          where: { id: "asset-1" },
          data: { processingStatus: "FAILED" },
        });
      } finally {
        jest.useRealTimers();
      }
    });
  });
});
