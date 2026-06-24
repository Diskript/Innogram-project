import { Test, TestingModule } from "@nestjs/testing";
import { FeedController } from "./feed.controller";
import { FeedService } from "./feed.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";

describe("FeedController", () => {
  let controller: FeedController;

  const mockFeedService = {
    generateFeed: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn().mockReturnValue(true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FeedController],
      providers: [
        { provide: FeedService, useValue: mockFeedService },
        { provide: JwtAuthGuard, useValue: mockJwtAuthGuard },
      ],
    }).compile();

    controller = module.get<FeedController>(FeedController);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
