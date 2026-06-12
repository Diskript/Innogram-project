import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtUser } from "@repo/shared-types";
import { User } from "@repo/database";

@Injectable()
export class FollowingsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getFollows(user: JwtUser): Promise<User[] | null> {
    const follows = await this.prismaService.client.users_Follows.findMany({
      where: {
        followerId: user.userId,
      },
      include: {
        following: true,
      },
    });
    return follows.length ? follows.map((follow) => follow.following) : null;
  }

  async getFollowers(user: JwtUser): Promise<User[] | null> {
    const followers = await this.prismaService.client.users_Follows.findMany({
      where: {
        followingId: user.userId,
      },
      include: {
        follower: true,
      },
    });
    return followers.length ? followers.map((follow) => follow.follower) : null;
  }

  async followUnfollow(user: JwtUser, id: string) {
    const existingFollow =
      await this.prismaService.client.users_Follows.findFirst({
        where: {
          followerId: user.userId,
          followingId: id,
        },
      });

    if (existingFollow) {
      await this.prismaService.client.users_Follows.delete({
        where: {
          id: existingFollow.id,
        },
      });
    } else {
      await this.prismaService.client.users_Follows.create({
        data: {
          followerId: user.userId,
          followingId: id,
        },
      });
    }
  }
}
