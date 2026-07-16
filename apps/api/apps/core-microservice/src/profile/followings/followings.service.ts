import { Injectable, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { JwtUser, FollowStatus } from "@repo/shared-types";

@Injectable()
export class FollowingsService {
  constructor(private readonly prismaService: PrismaService) {}

  async getAcceptedFollowingIds(user: JwtUser): Promise<string[]> {
    const follows = await this.prismaService.client.users_Follows.findMany({
      where: {
        followerId: user.userId,
        status: "ACCEPTED",
      },
      select: {
        followingId: true,
      },
    });
    return follows.map((f) => f.followingId);
  }

  async getPendingFollowingIds(user: JwtUser): Promise<string[]> {
    const follows = await this.prismaService.client.users_Follows.findMany({
      where: {
        followerId: user.userId,
        status: "PENDING",
      },
      select: {
        followingId: true,
      },
    });
    return follows.map((f) => f.followingId);
  }

  async isFollowing(followerId: string, followingId: string): Promise<boolean> {
    const follow = await this.prismaService.client.users_Follows.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId,
        },
      },
      select: {
        status: true,
      },
    });
    return follow?.status === "ACCEPTED";
  }

  async getFollows(user: JwtUser) {
    const follows = await this.prismaService.client.users_Follows.findMany({
      where: {
        followerId: user.userId,
        status: "ACCEPTED",
      },
      include: {
        following: {
          select: {
            id: true,
            userName: true,
            displayName: true,
            avatarUrl: true,
            isPublic: true,
          },
        },
      },
    });
    return follows.length ? follows.map((follow) => follow.following) : null;
  }

  async getFollowers(user: JwtUser) {
    const followers = await this.prismaService.client.users_Follows.findMany({
      where: {
        followingId: user.userId,
        status: "ACCEPTED",
      },
      include: {
        follower: {
          select: {
            id: true,
            userName: true,
            displayName: true,
            avatarUrl: true,
            isPublic: true,
          },
        },
      },
    });
    return followers.length ? followers.map((follow) => follow.follower) : null;
  }

  async followUnfollow(user: JwtUser, id: string) {
    const targetUser = await this.prismaService.client.user.findUnique({
      where: { id },
      select: { id: true, isPublic: true },
    });

    if (!targetUser) {
      throw new BadRequestException("User not found");
    }

    if (targetUser.id === user.userId) {
      throw new BadRequestException("Cannot follow yourself");
    }

    const existingFollow =
      await this.prismaService.client.users_Follows.findUnique({
        where: {
          followerId_followingId: {
            followerId: user.userId,
            followingId: id,
          },
        },
      });

    if (existingFollow) {
      await this.prismaService.client.users_Follows.delete({
        where: {
          id: existingFollow.id,
        },
      });
      return { action: "unfollowed" };
    } else {
      const status = targetUser.isPublic
        ? FollowStatus.ACCEPTED
        : FollowStatus.PENDING;
      await this.prismaService.client.users_Follows.create({
        data: {
          followerId: user.userId,
          followingId: id,
          status,
        },
      });
      return {
        action: status === FollowStatus.ACCEPTED ? "followed" : "requested",
      };
    }
  }

  async acceptFollowRequest(currentUser: JwtUser, requesterUserId: string) {
    const request = await this.prismaService.client.users_Follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: requesterUserId,
          followingId: currentUser.userId,
        },
      },
    });

    if (!request) {
      throw new BadRequestException("No pending follow request found");
    }

    if (request.status !== "PENDING") {
      throw new BadRequestException("Follow request is not pending");
    }

    await this.prismaService.client.users_Follows.update({
      where: { id: request.id },
      data: { status: "ACCEPTED" },
    });

    return { action: "accepted" };
  }

  async rejectFollowRequest(currentUser: JwtUser, requesterUserId: string) {
    const request = await this.prismaService.client.users_Follows.findUnique({
      where: {
        followerId_followingId: {
          followerId: requesterUserId,
          followingId: currentUser.userId,
        },
      },
    });

    if (!request || request.status !== "PENDING") {
      throw new BadRequestException("No pending follow request found");
    }

    await this.prismaService.client.users_Follows.delete({
      where: { id: request.id },
    });

    return { action: "rejected" };
  }

  async getPendingRequests(user: JwtUser) {
    const requests = await this.prismaService.client.users_Follows.findMany({
      where: {
        followingId: user.userId,
        status: "PENDING",
      },
      include: {
        follower: {
          select: {
            id: true,
            userName: true,
            displayName: true,
            avatarUrl: true,
            isPublic: true,
          },
        },
      },
    });

    return requests.map((r) => r.follower);
  }

  async getSentRequests(user: JwtUser) {
    const requests = await this.prismaService.client.users_Follows.findMany({
      where: {
        followerId: user.userId,
        status: "PENDING",
      },
      include: {
        following: {
          select: {
            id: true,
            userName: true,
            displayName: true,
            avatarUrl: true,
            isPublic: true,
          },
        },
      },
    });

    return requests.map((r) => r.following);
  }
}
