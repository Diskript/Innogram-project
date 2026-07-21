import { Test, TestingModule } from "@nestjs/testing";
import { FeedService } from "./feed.service";
import { PrismaService } from "../../prisma/prisma.service";
import { FollowingsService } from "../../profile/followings/followings.service";

describe("FeedService", () => {
  let service: FeedService;

  const mockPrismaService = {
    client: {
      post: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
    },
  };

  const mockFollowingsService = {
    getAcceptedFollowingIds: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FeedService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: FollowingsService,
          useValue: mockFollowingsService,
        },
      ],
    }).compile();

    service = module.get<FeedService>(FeedService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
