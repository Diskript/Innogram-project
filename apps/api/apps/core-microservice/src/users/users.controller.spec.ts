import { Test, TestingModule } from "@nestjs/testing";
import { UsersController } from "./users.controller";
import { UsersService } from "./users.service";
import { PrismaService } from "../prisma/prisma.service";
import { JwtUser } from "@repo/shared-types";

describe("UsersController", () => {
  let controller: UsersController;
  let service: UsersService;
  const mockUser: JwtUser = { userId: "owner-uuid", email: "owner@test.com" };

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

  describe("PATCH /users/:id", () => {
    it("should call service.update with current user id", async () => {
      const dto = { displayName: "New Name" };
      await controller.update(dto, mockUser);
      expect(service.update).toHaveBeenCalledWith(
        mockUser.userId,
        dto,
        mockUser.userId,
      );
    });
  });

  describe("DELETE /users/:id", () => {
    it("should call service.remove with current user id", async () => {
      await controller.remove(mockUser);
      expect(service.remove).toHaveBeenCalledWith(
        mockUser.userId,
        mockUser.userId,
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
