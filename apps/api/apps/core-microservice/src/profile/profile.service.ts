import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateUserDto } from "@repo/shared-types";

@Injectable()
export class ProfileService {
  constructor(private readonly prismaService: PrismaService) {}

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

    return this.prismaService.client.user.update({
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
    });
  }

  async getPublicProfile(username: string) {
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
      },
    });

    if (!user || user.deleted) {
      throw new NotFoundException(`User "${username}" not found`);
    }

    return user;
  }
}
