import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  CreatePostDto,
  JwtUser,
  QueryPostDto,
  SearchPostDto,
  UpdatePostDto,
  Visibility,
} from "@repo/shared-types";
import { Prisma } from "@repo/database";

@Injectable()
export class PostsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createPostDto: CreatePostDto) {
    const { userId, content, assetIds, visibility } = createPostDto;

    const post = await this.prismaService.client.post.create({
      data: {
        userId,
        content,
        visibility: visibility ?? Visibility.PUBLIC,
        createdBy: userId,
        updatedBy: userId,
        ...(assetIds &&
          assetIds.length > 0 && {
            postsAssets: {
              create: assetIds.map((assetId, index) => ({
                assetId,
                orderIndex: index,
              })),
            },
          }),
      },
      include: {
        postsAssets: {
          include: {
            asset: true,
          },
          orderBy: {
            orderIndex: "asc",
          },
        },
      },
    });

    return post;
  }

  async findAll(query: QueryPostDto, currentUser?: JwtUser) {
    const { skip = 0, take = 10, userId } = query;
    const where: Prisma.PostWhereInput = {};

    if (userId) {
      where.userId = userId;

      if (currentUser && currentUser.userId !== userId) {
        const follow = await this.prismaService.client.users_Follows.findUnique(
          {
            where: {
              followerId_followingId: {
                followerId: currentUser.userId,
                followingId: userId,
              },
            },
            select: { status: true },
          },
        );

        if (follow?.status === "ACCEPTED") {
          where.visibility = { in: [Visibility.PUBLIC, Visibility.FOLLOWERS] };
        } else {
          const author = await this.prismaService.client.user.findUnique({
            where: { id: userId },
            select: { isPublic: true },
          });

          if (author?.isPublic) {
            where.visibility = Visibility.PUBLIC;
          } else {
            where.id = "none";
          }
        }
      }
    }

    const [posts, total] = await Promise.all([
      this.prismaService.client.post.findMany({
        where,
        skip,
        take,
        orderBy: {
          createdAt: "desc",
        },
        include: {
          postsAssets: {
            include: {
              asset: true,
            },
            orderBy: {
              orderIndex: "asc",
            },
          },
        },
      }),
      this.prismaService.client.post.count({ where }),
    ]);

    return {
      data: posts,
      total,
      skip,
      take,
    };
  }

  async search(query: SearchPostDto) {
    const { q, skip = 0, take = 20 } = query;

    const where: Prisma.PostWhereInput = {
      visibility: Visibility.PUBLIC,
      archived: false,
      OR: [
        { content: { contains: q, mode: "insensitive" } },
        { tags: { hasSome: [q] } },
      ],
    };

    const [posts, total] = await Promise.all([
      this.prismaService.client.post.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          postsAssets: {
            include: {
              asset: true,
            },
            orderBy: {
              orderIndex: "asc",
            },
          },
        },
      }),
      this.prismaService.client.post.count({ where }),
    ]);

    return {
      data: posts,
      total,
      skip,
      take,
    };
  }

  async findOne(id: string) {
    const post = await this.prismaService.client.post.findUnique({
      where: { id },
      include: {
        postsAssets: {
          include: {
            asset: true,
          },
          orderBy: {
            orderIndex: "asc",
          },
        },
        comments: {
          where: {
            parentCommentId: null,
          },
          include: {
            childComments: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return post;
  }

  async update(id: string, updatePostDto: UpdatePostDto) {
    const post = await this.prismaService.client.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return this.prismaService.client.post.update({
      where: { id },
      data: {
        ...updatePostDto,
        updatedAt: new Date(),
      },
      include: {
        postsAssets: {
          include: {
            asset: true,
          },
          orderBy: {
            orderIndex: "asc",
          },
        },
      },
    });
  }

  async remove(id: string) {
    const post = await this.prismaService.client.post.findUnique({
      where: { id },
    });

    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return this.prismaService.client.post.delete({
      where: { id },
    });
  }
}
