import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { FollowingsService } from "../../profile/followings/followings.service";
import { RedisService } from "../../cache/redis.service";
import { JwtUser, QueryFeedDto } from "@repo/shared-types";
import { Prisma, Visibility } from "@repo/database";

const FEED_TTL_SECONDS = 60;

export interface FeedPage {
  data: unknown[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
}

@Injectable()
export class FeedService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly followingsService: FollowingsService,
    private readonly redisService: RedisService,
  ) {}

  async generateFeed(user: JwtUser, query: QueryFeedDto): Promise<FeedPage> {
    const { cursor, take = 20 } = query;

    // The payload embeds the requesting user's like-state (postLikes
    // filtered by userId, which the web layer maps to likedByMe), so the
    // key MUST be scoped per user, not just per page.
    const cacheKey = `feed:public:${user.userId}:${cursor ?? "start"}:${take}`;
    const cached = await this.redisService.get<FeedPage>(cacheKey);
    if (cached) {
      return cached;
    }

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
          _count: {
            select: { postLikes: true, comments: true },
          },
          postLikes: {
            where: { userId: user.userId },
            select: { id: true },
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

    const result = {
      data: items,
      total,
      nextCursor: hasMore ? nextCursor : null,
      hasMore,
    };

    await this.redisService.set(cacheKey, result, FEED_TTL_SECONDS);

    return result;
  }
}
