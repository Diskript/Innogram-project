import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtUser } from "@repo/shared-types";

@Injectable()
export class ArchiveService {
  constructor(private readonly prismaService: PrismaService) {}

  async archivePost(user: JwtUser, id: string) {
    const post = await this.prismaService.client.post.findUnique({
      where: { id },
    });

    if (post?.userId !== user.userId) {
      throw new ForbiddenException("Not allowed");
    }
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return this.prismaService.client.post.update({
      where: { id },
      data: {
        archived: true,
      },
    });
  }

  async getArchived(user: JwtUser) {
    const id = user.userId;

    const posts = await this.prismaService.client.post.findMany({
      where: { archived: true, userId: id },
    });

    if (!posts) {
      throw new NotFoundException("No archived posts found");
    }

    return posts;
  }

  async unArchive(user: JwtUser, id: string) {
    const post = await this.prismaService.client.post.findUnique({
      where: { id },
    });

    if (post?.userId !== user.userId) {
      throw new ForbiddenException("Not allowed");
    }
    if (!post) {
      throw new NotFoundException(`Post with ID ${id} not found`);
    }

    return this.prismaService.client.post.update({
      where: { id },
      data: {
        archived: false,
      },
    });
  }
}
