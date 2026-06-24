import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { FollowingsService } from "../../profile/followings/followings.service";
import { JwtUser, QueryFeedDto } from "@repo/shared-types";
import { Prisma, Visibility } from "@repo/database";

@Injectable()
export class FeedService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly followingsService: FollowingsService,
  ) {}

  async generateFeed(user: JwtUser, query: QueryFeedDto) {
    const { cursor, take = 20 } = query;

    const acceptedFollowingIds =
      await this.followingsService.getAcceptedFollowingIds(user);

    const where: Prisma.PostWhereInput = {
      archived: false,
      userId: { not: user.userId },
    };

    const followedCondition =
      acceptedFollowingIds.length > 0
        ? {
            userId: { in: acceptedFollowingIds },
            visibility: { in: [Visibility.PUBLIC, Visibility.FOLLOWERS] },
          }
        : null;

    const nonFollowedCondition: Prisma.PostWhereInput = {
      userId:
        acceptedFollowingIds.length > 0
          ? { notIn: acceptedFollowingIds }
          : undefined,
      visibility: Visibility.PUBLIC,
      creator: { isPublic: true },
    };

    where.OR = [
      ...(followedCondition ? [followedCondition] : []),
      nonFollowedCondition,
    ].filter(Boolean) as Prisma.PostWhereInput[];

    const [posts, total] = await Promise.all([
      this.prismaService.client.post.findMany({
        where,
        take: take + 1,
        ...(cursor ? { skip: 1, cursor: { id: cursor } } : {}),
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        select: {
          id: true,
          content: true,
          visibility: true,
          createdAt: true,
          userId: true,
          creator: {
            select: {
              id: true,
              userName: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          postsAssets: {
            select: {
              orderIndex: true,
              asset: {
                select: {
                  id: true,
                  filePath: true,
                  thumbnailPath: true,
                  mediumPath: true,
                  fileType: true,
                  width: true,
                  height: true,
                },
              },
            },
            orderBy: { orderIndex: "asc" },
          },
        },
      }),
      this.prismaService.client.post.count({ where }),
    ]);

    const hasMore = posts.length > take;
    const items = hasMore ? posts.slice(0, take) : posts;
    const nextCursor = items.length > 0 ? items[items.length - 1].id : null;

    return {
      data: items,
      total,
      nextCursor: hasMore ? nextCursor : null,
      hasMore,
    };
  }
}
