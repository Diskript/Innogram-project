import { Test, TestingModule } from "@nestjs/testing";
import { ProfileService } from "./profile.service";
import { PrismaService } from "../prisma/prisma.service";

describe("ProfileService", () => {
  let service: ProfileService;

  const mockPrismaService = {
    client: {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
