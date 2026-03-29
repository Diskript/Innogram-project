import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreatePostDto, UpdatePostDto } from "@repo/shared-types";

@Injectable()
export class PostsService {
  constructor(private readonly prismaService: PrismaService) {}

  async create(createPostDto: CreatePostDto) {
    const { userId, content, assets } = createPostDto;

    const post = await this.prismaService.client.post.create({
      data: {
        userId,
        content,
        createdBy: userId,
        updatedBy: userId,
        ...(assets &&
          assets.length > 0 && {
            postsAssets: {
              create: assets.map((asset, index) => ({
                orderIndex: asset.orderIndex ?? index,
                createdBy: userId,
                asset: {
                  create: {
                    fileName: asset.fileName,
                    filePath: asset.filePath,
                    fileType: asset.fileType,
                    fileSize: asset.fileSize,
                    orderIndex: asset.orderIndex ?? index,
                    createdBy: userId,
                  },
                },
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

  async findAll(skip: number = 0, take: number = 10, userId?: string) {
    const where = userId ? { userId } : {};

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

    // Soft delete by archiving
    return this.prismaService.client.post.update({
      where: { id },
      data: {
        archived: true,
        updatedAt: new Date(),
      },
    });
  }
}
