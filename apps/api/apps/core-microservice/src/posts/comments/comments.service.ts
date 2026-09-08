import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { CreateCommentDto, QueryCommentDto } from "@repo/shared-types";
import { MentionsService } from "../../mentions/mentions.service";
import { NotificationsService } from "../../notifications/notifications.service";

@Injectable()
export class CommentsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly mentionsService: MentionsService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(postId: string, userId: string, dto: CreateCommentDto) {
    const post = await this.prismaService.client.post.findUnique({
      where: { id: postId },
      select: { id: true, userId: true },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${postId} not found`);
    }

    if (dto.parentCommentId) {
      const parent = await this.prismaService.client.comment.findUnique({
        where: { id: dto.parentCommentId },
        select: { id: true, postId: true },
      });

      if (!parent || parent.postId !== postId) {
        throw new NotFoundException("Parent comment not found on this post");
      }
    }

    const comment = await this.prismaService.client.comment.create({
      data: {
        postId,
        userId,
        content: dto.content,
        parentCommentId: dto.parentCommentId ?? null,
        createdBy: userId,
        updatedBy: userId,
      },
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
    });

    await this.mentionsService.notifyMentionedUsers(
      userId,
      comment.id,
      dto.content,
    );

    if (post.userId !== userId) {
      await this.notificationsService.create(
        post.userId,
        userId,
        "COMMENT",
        postId,
      );
    }

    return comment;
  }

  async findByPost(postId: string, query: QueryCommentDto) {
    const { skip = 0, take = 10 } = query;

    const where = { postId, parentCommentId: null };

    const [comments, total] = await Promise.all([
      this.prismaService.client.comment.findMany({
        where,
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
          childComments: {
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
            orderBy: { createdAt: "asc" },
          },
          _count: {
            select: { commentLikes: true },
          },
        },
        orderBy: { createdAt: "desc" },
      }),
      this.prismaService.client.comment.count({ where }),
    ]);

    return { data: comments, total, skip, take };
  }

  async update(commentId: string, userId: string, content: string) {
    const comment = await this.prismaService.client.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException("You can only edit your own comments");
    }

    return this.prismaService.client.comment.update({
      where: { id: commentId },
      data: { content, updatedAt: new Date(), updatedBy: userId },
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
    });
  }

  async remove(commentId: string, userId: string) {
    const comment = await this.prismaService.client.comment.findUnique({
      where: { id: commentId },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    if (comment.userId !== userId) {
      throw new ForbiddenException("You can only delete your own comments");
    }

    await this.prismaService.client.comment.delete({
      where: { id: commentId },
    });

    return { action: "deleted" };
  }

  async toggleLike(commentId: string, userId: string) {
    const comment = await this.prismaService.client.comment.findUnique({
      where: { id: commentId },
      select: { id: true },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${commentId} not found`);
    }

    const existingLike = await this.prismaService.client.commentLike.findUnique(
      {
        where: {
          commentId_userId: { commentId, userId },
        },
      },
    );

    if (existingLike) {
      await this.prismaService.client.commentLike.delete({
        where: { id: existingLike.id },
      });
      return { action: "unliked" as const };
    }

    await this.prismaService.client.commentLike.create({
      data: { commentId, userId },
    });

    return { action: "liked" as const };
  }
}
