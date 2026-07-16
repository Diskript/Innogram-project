import { Test, TestingModule } from "@nestjs/testing";
import { UsersService } from "./users.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

describe("UsersService", () => {
  let service: UsersService;

  const mockUser = {
    id: "user-1",
    userName: "testuser",
    displayName: "Test User",
    avatarUrl: "avatar.jpg",
    bio: "hello",
    isPublic: true,
    deleted: false,
    role: "USER",
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    birthday: new Date(),
  };

  const mockFollowerUser = {
    id: "follower-1",
    userName: "follower",
    displayName: "Follower User",
    avatarUrl: null,
    bio: null,
    isPublic: true,
  };

  const mockFollowingUser = {
    id: "following-1",
    userName: "following",
    displayName: "Following User",
    avatarUrl: null,
    bio: null,
    isPublic: true,
  };

  const mockFindUnique = jest.fn();
  const mockFindMany = jest.fn();
  const mockCount = jest.fn();

  beforeEach(async () => {
    mockFindUnique.mockReset();
    mockFindMany.mockReset();
    mockCount.mockReset();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        {
          provide: PrismaService,
          useValue: {
            client: {
              user: {
                findUnique: mockFindUnique,
              },
              users_Follows: {
                findMany: mockFindMany,
                count: mockCount,
              },
            },
          },
        },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getUserFollowers", () => {
    it("should return paginated followers when user exists", async () => {
      mockFindUnique.mockResolvedValue(mockUser);
      mockFindMany.mockResolvedValue([
        { follower: mockFollowerUser },
        { follower: { ...mockFollowerUser, id: "follower-2" } },
      ]);
      mockCount.mockResolvedValue(2);

      const result = await service.getUserFollowers("user-1", 0, 10);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: { id: true, deleted: true },
      });
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { followingId: "user-1", status: "ACCEPTED" },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          follower: {
            select: {
              id: true,
              userName: true,
              displayName: true,
              avatarUrl: true,
              bio: true,
              isPublic: true,
            },
          },
        },
      });
      expect(mockCount).toHaveBeenCalledWith({
        where: { followingId: "user-1", status: "ACCEPTED" },
      });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should throw NotFoundException when user not found", async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(
        service.getUserFollowers("nonexistent", 0, 10),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when user is deleted", async () => {
      mockFindUnique.mockResolvedValue({ ...mockUser, deleted: true });

      await expect(
        service.getUserFollowers("deleted-user", 0, 10),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getUserFollowing", () => {
    it("should return paginated following when user exists", async () => {
      mockFindUnique.mockResolvedValue(mockUser);
      mockFindMany.mockResolvedValue([
        { following: mockFollowingUser },
        { following: { ...mockFollowingUser, id: "following-2" } },
      ]);
      mockCount.mockResolvedValue(2);

      const result = await service.getUserFollowing("user-1", 0, 10);

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: { id: true, deleted: true },
      });
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { followerId: "user-1", status: "ACCEPTED" },
        skip: 0,
        take: 10,
        orderBy: { createdAt: "desc" },
        include: {
          following: {
            select: {
              id: true,
              userName: true,
              displayName: true,
              avatarUrl: true,
              bio: true,
              isPublic: true,
            },
          },
        },
      });
      expect(mockCount).toHaveBeenCalledWith({
        where: { followerId: "user-1", status: "ACCEPTED" },
      });
      expect(result.data).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it("should throw NotFoundException when user not found", async () => {
      mockFindUnique.mockResolvedValue(null);

      await expect(
        service.getUserFollowing("nonexistent", 0, 10),
      ).rejects.toThrow(NotFoundException);
    });

    it("should throw NotFoundException when user is deleted", async () => {
      mockFindUnique.mockResolvedValue({ ...mockUser, deleted: true });

      await expect(
        service.getUserFollowing("deleted-user", 0, 10),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
