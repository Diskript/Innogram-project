import { Test, TestingModule } from "@nestjs/testing";
import { FollowingsService } from "./followings.service";
import { PrismaService } from "../../prisma/prisma.service";

describe("FollowingsService", () => {
  let service: FollowingsService;

  const mockPrismaService = {
    client: {
      user: {
        findUnique: jest.fn(),
      },
      users_Follows: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowingsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<FollowingsService>(FollowingsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
