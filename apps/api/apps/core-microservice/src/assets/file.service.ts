import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import path, { join } from "path";
// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Multer } from "multer";
import { JwtUser, Visibility } from "@repo/shared-types";
import { ALLOWED_TYPES, isImage, isVideo } from "./utils/mime-types";
import { generateFileName, getStoragePath } from "./utils/file-naming";
import * as fs from "fs/promises";

@Injectable()
export class FileService {
  private readonly maxImageSize = 10 * 1024 * 1024; // 10MB
  private readonly maxVideoSize = 100 * 1024 * 1024; // 100MB
  private readonly uploadDir = path.join(__dirname, "..", "uploads");

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
  ): Promise<{ fileType: string; filePath: string; fileName: string }> {
    this.validateFile(file);

    const fileName = generateFileName(file.originalname);
    const relativePath = getStoragePath(visibility, user.userId, fileName);
    const absolutePath = join(this.uploadDir, relativePath);

    await fs.mkdir(join(absolutePath, ".."), { recursive: true });
    await fs.writeFile(absolutePath, file.buffer);

    return {
      fileType: file.mimetype,
      filePath: relativePath,
      fileName,
    };
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
