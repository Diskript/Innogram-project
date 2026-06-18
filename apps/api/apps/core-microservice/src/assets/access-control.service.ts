import { ForbiddenException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Visibility } from "@repo/shared-types";

@Injectable()
export class AccessControlService {
  constructor(private readonly prismaService: PrismaService) {}

  async canAccessAssets(
    userId: string,
    assetIds: string[],
  ): Promise<Map<string, boolean>> {
    const accessibleAssets = await this.prismaService.client.asset.findMany({
      where: {
        id: { in: assetIds },
        OR: [
          { ownerId: userId },
          { visibility: Visibility.PUBLIC },
          {
            visibility: Visibility.FOLLOWERS,
            owner: {
              followers: {
                some: { followerId: userId },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    const accessibleIds = new Set(accessibleAssets.map((a) => a.id));

    const result = new Map<string, boolean>();
    for (const id of assetIds) {
      result.set(id, accessibleIds.has(id));
    }

    return result;
  }

  async canAccessAsset(userId: string, assetId: string): Promise<boolean> {
    const asset = await this.prismaService.client.asset.findFirst({
      where: {
        id: assetId,
        OR: [
          { ownerId: userId },
          { visibility: Visibility.PUBLIC },
          {
            visibility: Visibility.FOLLOWERS,
            owner: {
              followers: {
                some: { followerId: userId },
              },
            },
          },
        ],
      },
      select: { id: true },
    });

    return !!asset;
  }

  async assertCanAccess(userId: string, assetId: string): Promise<void> {
    const canAccess = await this.canAccessAsset(userId, assetId);

    if (!canAccess) {
      throw new ForbiddenException("Forbidden");
    }
  }
}
