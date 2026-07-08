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
});
