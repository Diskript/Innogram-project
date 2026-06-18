import {
  Injectable,
  InternalServerErrorException,
  ForbiddenException,
  NotFoundException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { FileService } from "./file.service";
import { ThumbnailService } from "./thumbnail.service";
import { AccessControlService } from "./access-control.service";
import {
  JwtUser,
  UpdateAssetDto,
  UploadAssetDto,
  Visibility,
} from "@repo/shared-types";
import { Asset } from "@repo/database";
import { createReadStream, statSync } from "fs";
import { Request, Response } from "express";

@Injectable()
export class AssetsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly fileService: FileService,
    private readonly thumbnailService: ThumbnailService,
    private readonly AccessControlService: AccessControlService,
  ) {}

  async uploadAsset(
    file: Express.Multer.File,
    user: JwtUser,
    uploadAssetDto: UploadAssetDto,
  ) {
    try {
      const { fileType, filePath, fileName } = await this.fileService.saveFile(
        file,
        user,
        uploadAssetDto.visibility,
      );

      // Declare variables in outer scope to be accessible after if/else blocks
      let thumbnailPath: string | null = null;
      let mediumPath: string | null = null;
      let width: number | null = null;
      let height: number | null = null;
      let duration: number | null = null;

      if (fileType.startsWith("image/")) {
        const result =
          await this.thumbnailService.generateImageThumbnail(filePath);

        thumbnailPath = result.thumbnailPath;
        mediumPath = result.mediumPath;
        width = result.width;
        height = result.height;
      } else if (fileType.startsWith("video/")) {
        const result =
          await this.thumbnailService.generateVideoThumbnail(filePath);

        thumbnailPath = result.thumbnailPath;
        width = result.width;
        height = result.height;
        duration = result.duration;
      }

      const asset = await this.prismaService.client.asset.create({
        data: {
          fileName,
          originalName: file.originalname,
          filePath,
          thumbnailPath,
          mediumPath,
          fileType,
          fileSize: file.size,
          width,
          height,
          duration,
          title: uploadAssetDto.title,
          description: uploadAssetDto.description,
          tags: uploadAssetDto.tags ?? [],
          visibility: uploadAssetDto.visibility,
          ownerId: user.userId,
          createdBy: user.userId,
        },
      });

      return this.mapToResponseDto(asset);
    } catch (error) {
      console.error(error);

      throw new InternalServerErrorException(
        `Error while uploading the asset: ${error instanceof Error ? error.message : "Unknown erorr"}`,
      );
    }
  }

  async uploadMultipleAssets(
    files: Express.Multer.File[],
    user: JwtUser,
    uploadAssetDto: UploadAssetDto,
  ) {
    const results = await Promise.all(
      files.map((file) => this.uploadAsset(file, user, uploadAssetDto)),
    );
    return results;
  }

  async uploadConversationAsset(
    file: Express.Multer.File,
    user: JwtUser,
    conversationId: string,
    dto: UploadAssetDto,
  ) {
    // Verify user is participant in the conversation
    const participant =
      await this.prismaService.client.conversation_Participant.findFirst({
        where: {
          conversationId,
          userId: user.userId,
          leftAt: null,
        },
      });

    if (!participant) {
      throw new ForbiddenException(
        "User is not a participant of this conversation",
      );
    }

    // Save file with conversation ID in path
    const { fileName, filePath, fileType } = await this.fileService.saveFile(
      file,
      user,
      Visibility.PRIVATE,
      conversationId,
    );

    // Generate thumbnails
    let thumbnailPath: string | null = null;
    let mediumPath: string | null = null;
    let width: number | null = null;
    let height: number | null = null;
    let duration: number | null = null;

    try {
      if (fileType.startsWith("image/")) {
        const result =
          await this.thumbnailService.generateImageThumbnail(filePath);
        thumbnailPath = result.thumbnailPath;
        mediumPath = result.mediumPath;
        width = result.width;
        height = result.height;
      } else if (fileType.startsWith("video/")) {
        const result =
          await this.thumbnailService.generateVideoThumbnail(filePath);
        thumbnailPath = result.thumbnailPath;
        width = result.width;
        height = result.height;
        duration = result.duration;
      }
    } catch (error) {
      console.error("Thumbnail generation failed:", error);
    }

    // Create database record
    const asset = await this.prismaService.client.asset.create({
      data: {
        fileName,
        originalName: file.originalname,
        filePath,
        thumbnailPath,
        mediumPath,
        fileType,
        fileSize: file.size,
        width,
        height,
        duration,
        title: dto.title,
        description: dto.description,
        tags: dto.tags ?? [],
        visibility: Visibility.PRIVATE,
        ownerId: user.userId,
        createdBy: user.userId,
      },
    });

    return this.mapToResponseDto(asset);
  }

  async uploadMultipleConversationAssets(
    files: Express.Multer.File[],
    user: JwtUser,
    conversationId: string,
    dto: UploadAssetDto,
  ) {
    const results = await Promise.all(
      files.map((file) =>
        this.uploadConversationAsset(file, user, conversationId, dto),
      ),
    );
    return results;
  }

  async getAsset(assetId: string, user: JwtUser) {
    const asset = await this.prismaService.client.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    await this.AccessControlService.assertCanAccess(user.userId, assetId);

    return this.mapToResponseDto(asset);
  }

  async getConversationAssets(
    user: JwtUser,
    conversationId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    await this.AccessControlService.assertConversationAccess(
      user.userId,
      conversationId,
    );

    const skip = (page - 1) * limit;

    const [assets, total] = await Promise.all([
      this.prismaService.client.asset.findMany({
        where: {
          messageAssets: {
            some: {
              message: {
                conversationId,
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        include: {
          messageAssets: {
            include: {
              message: {
                select: {
                  senderId: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      }),
      this.prismaService.client.asset.count({
        where: {
          messageAssets: {
            some: {
              message: {
                conversationId,
              },
            },
          },
        },
      }),
    ]);

    return {
      data: assets.map((asset) => ({
        ...this.mapToResponseDto(asset),
        senderId: asset.messageAssets[0]?.message?.senderId,
        sentAt: asset.messageAssets[0]?.message?.createdAt,
      })),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getUserAssets(
    user: JwtUser,
    targetUserId: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const skip = (page - 1) * limit;

    const isOwnProfile = user.userId === targetUserId;
    const isFollowing =
      await this.prismaService.client.users_Follows.findUnique({
        where: {
          followerId_followingId: {
            followerId: user.userId,
            followingId: targetUserId,
          },
        },
      });

    const visibilityFilter = isOwnProfile
      ? {}
      : isFollowing
        ? { visibility: { in: [Visibility.PUBLIC, Visibility.FOLLOWERS] } }
        : { visibility: Visibility.PUBLIC };

    const [assets, total] = await Promise.all([
      this.prismaService.client.asset.findMany({
        where: {
          ownerId: targetUserId,
          ...visibilityFilter,
        },
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
      }),
      this.prismaService.client.asset.count({
        where: {
          ownerId: targetUserId,
          ...visibilityFilter,
        },
      }),
    ]);

    return {
      data: assets.map((asset) => this.mapToResponseDto(asset)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async updateAsset(assetId: string, user: JwtUser, dto: UpdateAssetDto) {
    const asset = await this.prismaService.client.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    if (asset.ownerId !== user.userId) {
      throw new ForbiddenException("You can only update your own assets");
    }

    const updatedAsset = await this.prismaService.client.asset.update({
      where: { id: assetId },
      data: {
        title: dto.title,
        description: dto.description,
        tags: dto.tags,
        visibility: dto.visibility,
      },
    });

    return this.mapToResponseDto(updatedAsset);
  }

  async downloadAsset(
    assetId: string,
    user: JwtUser,
    req: Request,
    res: Response,
  ) {
    const asset = await this.prismaService.client.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    const canAccess = await this.AccessControlService.canAccessAsset(
      user.userId,
      assetId,
    );
    if (!canAccess) {
      throw new ForbiddenException("You do not have access to this asset");
    }

    const filePath = this.fileService.getFilePath(asset.filePath);
    const stat = statSync(filePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;

      res.status(206).set({
        "Content-Range": `bytes ${start}-${end}/${fileSize}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunksize,
        "Content-Type": asset.fileType,
        "Content-Disposition": `inline; filename="${asset.originalName}"`,
      });

      return createReadStream(filePath, { start, end }).pipe(res);
    }

    res.status(200).set({
      "Content-Length": fileSize,
      "Content-Type": asset.fileType,
      "Content-Disposition": `inline; filename="${asset.originalName}"`,
    });

    return createReadStream(filePath).pipe(res);
  }

  async deleteAsset(assetId: string, user: JwtUser) {
    const asset = await this.prismaService.client.asset.findUnique({
      where: { id: assetId },
    });

    if (!asset) {
      throw new NotFoundException(`Asset with ID ${assetId} not found`);
    }

    if (asset.ownerId !== user.userId) {
      throw new ForbiddenException("You can only delete your own assets");
    }

    const filesToDelete = [asset.filePath];
    if (asset.thumbnailPath) {
      filesToDelete.push(asset.thumbnailPath);
    }
    if (asset.mediumPath) {
      filesToDelete.push(asset.mediumPath);
    }

    await Promise.all(
      filesToDelete.map((path) => this.fileService.deleteFile(path)),
    );

    await this.prismaService.client.asset.delete({
      where: { id: assetId },
    });

    return { success: true };
  }

  private mapToResponseDto(asset: Asset) {
    return {
      id: asset.id,
      fileName: asset.fileName,
      originalName: asset.originalName,
      fileType: asset.fileType,
      fileSize: asset.fileSize,
      width: asset.width,
      height: asset.height,
      duration: asset.duration,
      title: asset.title,
      description: asset.description,
      visibility: asset.visibility,
      ownerId: asset.ownerId,
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
      url: `/assets/${asset.id}/download`,
      thumbnailUrl: asset.thumbnailPath
        ? `/assets/${asset.id}/thumbnail`
        : undefined,
      mediumUrl: asset.mediumPath ? `/assets/${asset.id}/medium` : undefined,
    };
  }
}
