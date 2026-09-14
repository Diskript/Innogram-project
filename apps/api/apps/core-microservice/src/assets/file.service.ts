import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from "@nestjs/common";
import path, { join } from "path";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Multer } from "multer";
import { JwtUser, Visibility } from "@repo/shared-types";
import { ALLOWED_TYPES, isImage, isVideo } from "./utils/mime-types";
import { generateFileName, getStoragePath } from "./utils/file-naming";
import * as fs from "fs/promises";

/**
 * Root of the on-disk upload tree. Exported because the multer disk
 * storage in the controller must stage files inside it (same
 * filesystem) so they can be renamed to their final location without a
 * cross-device copy.
 */
export const UPLOAD_ROOT = path.join(__dirname, "..", "uploads");

@Injectable()
export class FileService {
  private readonly maxImageSize = 10 * 1024 * 1024; // 10MB
  private readonly maxVideoSize = 100 * 1024 * 1024; // 100MB
  private readonly uploadDir = UPLOAD_ROOT;

  validateFile(file: Express.Multer.File): void {
    const mimeType = file.mimetype;
    const isImageType = isImage(mimeType);
    const isVideoType = isVideo(mimeType);

    if (!isImageType && !isVideoType) {
      throw new BadRequestException(
        `File type ${mimeType} is not allowed. Allowed types: ${[...ALLOWED_TYPES].join(", ")}`,
      );
    }

    const maxSize = isImageType ? this.maxImageSize : this.maxVideoSize;
    if (file.size > maxSize) {
      throw new BadRequestException(
        `File size ${file.size} exceeds maximum allowed size ${maxSize} bytes`,
      );
    }
  }

  getFilePath(relativePath: string): string {
    return join(this.uploadDir, relativePath);
  }

  async saveFile(
    file: Express.Multer.File,
    user: JwtUser,
    visibility: Visibility,
    conversationId?: string,
  ): Promise<{ fileType: string; filePath: string; fileName: string }> {
    this.validateFile(file);

    try {
      const fileName = generateFileName(file.originalname);
      const relativePath = getStoragePath(
        visibility,
        user,
        fileName,
        conversationId,
      );
      const absolutePath = join(this.uploadDir, relativePath);

      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await this.moveStagedFile(file.path, absolutePath);

      return {
        fileType: file.mimetype,
        filePath: relativePath,
        fileName,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Error while saving file: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  /**
   * Moves the multer-staged file to its final location. rename() keeps
   * the move atomic and zero-copy within one filesystem; the EXDEV
   * fallback covers deployments where staging ends up on another mount.
   */
  private async moveStagedFile(
    stagedPath: string | undefined,
    absolutePath: string,
  ): Promise<void> {
    if (!stagedPath) {
      throw new InternalServerErrorException(
        "Uploaded file is missing its staged path",
      );
    }

    try {
      await fs.rename(stagedPath, absolutePath);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "EXDEV") {
        await fs.copyFile(stagedPath, absolutePath);
        await fs.rm(stagedPath, { force: true });
        return;
      }
      throw error;
    }
  }

  async deleteFile(filePath: string): Promise<void> {
    const absolutePath = join(this.uploadDir, filePath);
    try {
      await fs.rm(absolutePath, { force: true });
    } catch (error) {
      throw new NotFoundException(error);
    }
  }

  async deleteFiles(filePaths: string[]): Promise<void> {
    await Promise.all(filePaths.map((path) => this.deleteFile(path)));
  }
}
