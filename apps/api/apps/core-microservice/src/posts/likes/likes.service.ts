import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { QueryPostLikesDto } from "@repo/shared-types";

@Injectable()
export class LikesService {
  constructor(private readonly prismaService: PrismaService) {}

  async togglePostLike(userId: string, postId: string) {
    const post = await this.prismaService.client.post.findUnique({
      where: { id: postId },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    const existingLike = await this.prismaService.client.postLike.findUnique({
      where: {
        postId_userId: { postId, userId },
      },
    });

    if (existingLike) {
      await this.prismaService.client.postLike.delete({
        where: { id: existingLike.id },
      });
      return { action: "unliked" as const };
    }

    await this.prismaService.client.postLike.create({
      data: { postId, userId },
    });

    return { action: "liked" as const };
  }

  async getPostLikedUsers(postId: string, query: QueryPostLikesDto) {
    const { skip, take } = query;

    const [likes, total] = await Promise.all([
      this.prismaService.client.postLike.findMany({
        where: { postId },
        skip,
        take,
        include: {
          user: {
            select: {
              id: true,
              userName: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prismaService.client.postLike.count({ where: { postId } }),
    ]);

    return {
      data: likes.map((like) => like.user),
      total,
    };
  }
}
