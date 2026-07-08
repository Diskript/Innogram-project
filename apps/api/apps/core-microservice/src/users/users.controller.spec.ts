import { Test, TestingModule } from "@nestjs/testing";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { PrismaService } from "../prisma/prisma.service";

describe("UsersController", () => {
  let controller: UsersController;
  let service: UsersService;

  const mockUsersService = {
    findAll: jest.fn(),
    search: jest.fn(),
    findOne: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
    getUserFollowers: jest.fn(),
    getUserFollowing: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        { provide: UsersService, useValue: mockUsersService },
        {
          provide: PrismaService,
          useValue: { client: {} },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    service = module.get<UsersService>(UsersService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("GET /users/:id/followers", () => {
    it("should call service.getUserFollowers with id and query", async () => {
      const userId = "test-uuid";
      const query = { skip: 0, take: 10 };
      await controller.getUserFollowers(userId, query);
      expect(service.getUserFollowers).toHaveBeenCalledWith(
        userId,
        query.skip,
        query.take,
      );
    });
  });

  describe("GET /users/:id/following", () => {
    it("should call service.getUserFollowing with id and query", async () => {
      const userId = "test-uuid";
      const query = { skip: 0, take: 10 };
      await controller.getUserFollowing(userId, query);
      expect(service.getUserFollowing).toHaveBeenCalledWith(
        userId,
        query.skip,
        query.take,
      );
    });
  });
});
