import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateUserDto } from "@repo/shared-types";

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async findAll(skip: number = 0, take: number = 10) {
    const [users, total] = await Promise.all([
      this.prismaService.client.user.findMany({
        where: {
          deleted: false,
        },
        skip,
        take,
        orderBy: {
          createdAt: "desc",
        },
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
        },
      }),
      this.prismaService.client.user.count({
        where: {
          deleted: false,
        },
      }),
    ]);

    return {
      data: users,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const user = await this.prismaService.client.user.findUnique({
      where: { id },
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
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async update(id: string, updateUserDto: UpdateUserDto, updatedBy?: string) {
    const user = await this.prismaService.client.user.findUnique({
      where: { id },
    });

    if (!user || user.deleted) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prismaService.client.user.update({
      where: { id },
      data: {
        ...updateUserDto,
        ...(updatedBy && { updatedBy }),
        updatedAt: new Date(),
      },
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
      },
    });
  }

  async remove(id: string, updatedBy?: string) {
    const user = await this.prismaService.client.user.findUnique({
      where: { id },
    });

    if (!user || user.deleted) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Soft delete
    return this.prismaService.client.user.update({
      where: { id },
      data: {
        deleted: true,
        ...(updatedBy && { updatedBy }),
        updatedAt: new Date(),
      },
    });
  }
}
