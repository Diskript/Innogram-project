import { Test, TestingModule } from "@nestjs/testing";
import { ArchiveService } from "./archive.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("ArchiveService", () => {
  let service: ArchiveService;

  const mockPrismaService = {
    client: {
      post: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ArchiveService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<ArchiveService>(ArchiveService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
