import { Test, TestingModule } from "@nestjs/testing";
import { ProfileService } from "./profile.service";
import { PrismaService } from "../prisma/prisma.service";
import { NotFoundException } from "@nestjs/common";

describe("ProfileService", () => {
  let service: ProfileService;

  const mockUser = {
    id: "user-1",
    role: "USER",
    disabled: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    userName: "testuser",
    displayName: "Test User",
    birthday: new Date("1990-01-01"),
    bio: "Hello!",
    avatarUrl: "avatar.jpg",
    isPublic: true,
    deleted: false,
    _count: { createdPosts: 5, followers: 10, following: 3, comments: 8 },
  };

  const mockPublicUser = {
    id: "user-1",
    userName: "testuser",
    displayName: "Test User",
    avatarUrl: "avatar.jpg",
    bio: "Hello!",
    isPublic: true,
    birthday: new Date("1990-01-01"),
    deleted: false,
    _count: { createdPosts: 5, followers: 10, following: 3 },
  };

  const mockFindUnique = jest.fn();
  const mockUpdate = jest.fn();

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: PrismaService,
          useValue: {
            client: {
              user: {
                findUnique: mockFindUnique,
                update: mockUpdate,
              },
            },
          },
        },
      ],
    }).compile();

    service = module.get<ProfileService>(ProfileService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("getProfile", () => {
    it("should return full user profile with counts", async () => {
      mockFindUnique.mockResolvedValue(mockUser);

      const result = await service.getProfile("user-1");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: "user-1" },
        select: expect.objectContaining({
          id: true,
          userName: true,
          _count: expect.objectContaining({
            select: {
              createdPosts: true,
              followers: true,
              following: true,
              comments: true,
            },
          }),
        }),
      });
      expect(result).toEqual(mockUser);
    });

    it("should throw NotFoundException when user not found", async () => {
      mockFindUnique.mockResolvedValue(null);
      await expect(service.getProfile("bad-id")).rejects.toThrow(
        NotFoundException,
      );
    });

    it("should throw NotFoundException when user is deleted", async () => {
      mockFindUnique.mockResolvedValue({ ...mockUser, deleted: true });
      await expect(service.getProfile("deleted-id")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("updateProfile", () => {
    it("should update and return profile fields", async () => {
      mockFindUnique.mockResolvedValue({ id: "user-1", deleted: false });
      mockUpdate.mockResolvedValue(mockPublicUser);

      const dto = { displayName: "Updated", bio: "New bio" };
      const result = await service.updateProfile("user-1", dto);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: "user-1" },
        data: {
          ...dto,
          updatedAt: expect.any(Date),
          updatedBy: "user-1",
        },
        select: {
          id: true,
          userName: true,
          displayName: true,
          birthday: true,
          bio: true,
          avatarUrl: true,
          isPublic: true,
        },
      });
      expect(result).toEqual(mockPublicUser);
    });

    it("should throw NotFoundException when user not found", async () => {
      mockFindUnique.mockResolvedValue(null);
      await expect(
        service.updateProfile("bad-id", { displayName: "X" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("getPublicProfile", () => {
    it("should return public profile by username", async () => {
      mockFindUnique.mockResolvedValue(mockPublicUser);

      const result = await service.getPublicProfile("testuser");

      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { userName: "testuser" },
        select: {
          id: true,
          userName: true,
          displayName: true,
          avatarUrl: true,
          bio: true,
          isPublic: true,
          birthday: true,
          deleted: true,
          _count: {
            select: { createdPosts: true, followers: true, following: true },
          },
        },
      });
      expect(result).toEqual(mockPublicUser);
    });

    it("should include follower/following/post counts", async () => {
      mockFindUnique.mockResolvedValue(mockPublicUser);

      const result = await service.getPublicProfile("testuser");

      expect(result._count).toEqual({
        createdPosts: 5,
        followers: 10,
        following: 3,
      });
    });

    it("should throw NotFoundException when username not found", async () => {
      mockFindUnique.mockResolvedValue(null);
      await expect(service.getPublicProfile("baduser")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
