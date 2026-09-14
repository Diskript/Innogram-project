import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { RedisService } from "../cache/redis.service";
import { UpdateUserDto } from "@repo/shared-types";

const PROFILE_TTL_SECONDS = 300;

@Injectable()
export class ProfileService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  async getProfile(userId: string) {
    const user = await this.prismaService.client.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        role: true,
        disabled: true,
        createdAt: true,
        updatedAt: true,
        userName: true,
        displayName: true,
        birthday: true,
        bio: true,
        avatarUrl: true,
        isPublic: true,
        deleted: true,
        _count: {
          select: {
            createdPosts: true,
            followers: true,
            following: true,
            comments: true,
          },
        },
      },
    });

    if (!user || user.deleted) {
      throw new NotFoundException("User not found");
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    const user = await this.prismaService.client.user.findUnique({
      where: { id: userId },
      select: { id: true, deleted: true },
    });

    if (!user || user.deleted) {
      throw new NotFoundException("User not found");
    }

    return this.prismaService.client.user
      .update({
        where: { id: userId },
        data: {
          ...dto,
          ...(dto.birthday && { birthday: new Date(dto.birthday) }),
          updatedAt: new Date(),
          updatedBy: userId,
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
      })
      .then(async (updated) => {
        // The update select carries the (possibly new) userName, which keys
        // the public-profile cache entry.
        await this.redisService.del(`profile:public:${updated.userName}`);
        return updated;
      });
  }

  async getPublicProfile(username: string) {
    const cacheKey = `profile:public:${username}`;
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      return cached;
    }

    const user = await this.prismaService.client.user.findUnique({
      where: { userName: username },
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
          select: {
            createdPosts: true,
            followers: true,
            following: true,
          },
        },
      },
    });

    if (!user || user.deleted) {
      throw new NotFoundException(`User "${username}" not found`);
    }

    await this.redisService.set(cacheKey, user, PROFILE_TTL_SECONDS);

    return user;
  }
}
