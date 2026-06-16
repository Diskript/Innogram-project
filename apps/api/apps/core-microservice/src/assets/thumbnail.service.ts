import { Injectable } from "@nestjs/common";
import { FileService } from "./file.service";
import sharp from "sharp";
import * as fs from "fs/promises";
import { generateMediumName, generateThumbnailName } from "./utils/file-naming";
import { basename, dirname, join } from "path";
import { promisify } from "util";
import { exec } from "child_process";

const execPromise = promisify(exec);

@Injectable()
export class ThumbnailService {
  private readonly uploadDir = join(__dirname, "..", "uploads");
  private readonly thumbnailWidth = 300;
  private readonly thumbnailHeight = 300;
  private readonly mediumWidth = 800;
  private readonly mediumHeight = 800;

  constructor(private readonly fileService: FileService) {}

  async generateImageThumbnail(filePath: string): Promise<{
    thumbnailPath: string;
    mediumPath: string;
    width: number;
    height: number;
  }> {
    const absolutePath = this.fileService.getFilePath(filePath);
    const fileName = basename(filePath);
    const dirPath = dirname(filePath);

    try {
      const image = sharp(absolutePath);

      // Получаем метаданные
      const metadata = await image.metadata();
      const width = metadata.width || 0;
      const height = metadata.height || 0;

      const thumbnailName = generateThumbnailName(fileName);
      const thumbnailPath = join(dirPath, "thumbnail", thumbnailName);
      const thumbnailAbsolute = join(this.uploadDir, thumbnailPath);

      const mediumName = generateMediumName(fileName);
      const mediumPath = join(dirPath, "medium", mediumName);
      const mediumAbsolute = join(this.uploadDir, mediumPath);

      await fs.mkdir(dirname(thumbnailAbsolute), { recursive: true });
      await fs.mkdir(dirname(mediumAbsolute), { recursive: true });

      await Promise.all([
        image
          .clone()
          .resize(this.thumbnailWidth, this.thumbnailHeight, {
            fit: "cover",
            position: "center",
          })
          .jpeg({ quality: 80 })
          .toFile(thumbnailAbsolute),

        image
          .clone()
          .resize(this.mediumWidth, this.mediumHeight, {
            fit: "inside",
            withoutEnlargement: true,
          })
          .jpeg({ quality: 85 })
          .toFile(mediumAbsolute),
      ]);

      return {
        thumbnailPath,
        mediumPath,
        width,
        height,
      };
    } catch (error) {
      console.error("Image processing error:", error);
      throw new Error(
        `Unable to load image thumbnail: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async generateVideoThumbnail(filePath: string): Promise<{
    thumbnailPath: string;
    width: number;
    height: number;
    duration: number;
  }> {
    // Безопасная работа с путями через модуль 'path'
    const absolutePath = this.fileService.getFilePath(filePath);
    const fileName = basename(filePath);
    const dirPath = dirname(filePath);

    try {
      // 1. Получаем метаданные (используем JSON для надёжности парсинга)
      const probeCommand = `ffprobe -v error -print_format json -show_entries stream=width,height:format=duration "${absolutePath.replace(/"/g, '\\"')}"`;
      const { stdout } = await execPromise(probeCommand);

      const metadata = JSON.parse(stdout);
      const width = metadata.streams?.[0]?.width || 0;
      const height = metadata.streams?.[0]?.height || 0;
      // Длительность надёжнее брать из format, а не из stream
      const duration = Number(metadata.format?.duration || 0);

      const thumbnailName = fileName.replace(/\.[^.]+$/, ".jpg");
      const thumbnailPath = join(dirPath, "thumbnail", thumbnailName);
      const thumbnailAbsolute = join(this.uploadDir, thumbnailPath);

      await fs.mkdir(dirname(thumbnailAbsolute), { recursive: true });

      const safeInputPath = absolutePath.replace(/"/g, '\\"');
      const safeOutputPath = thumbnailAbsolute.replace(/"/g, '\\"');

      const ffmpegCommand = `ffmpeg -ss 00:00:01 -i "${safeInputPath}" -vframes 1 -vf "scale=${this.thumbnailWidth}:${this.thumbnailHeight}:force_original_aspect_ratio=decrease" "${safeOutputPath}"`;

      await execPromise(ffmpegCommand);

      return {
        thumbnailPath,
        width,
        height,
        duration,
      };
    } catch (error) {
      console.error("Video Processing error:", error);
      throw new Error(
        `Unable to generate video thumbnail: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  async deleteThumbnails(filePath: string): Promise<void> {
    const fileName = basename(filePath);
    const dirPath = dirname(filePath);

    const thumbnailPath = join(
      dirPath,
      "thumbnail",
      generateThumbnailName(fileName),
    );
    const mediumPath = join(dirPath, "medium", generateMediumName(fileName));

    try {
      await this.fileService.deleteFiles([thumbnailPath, mediumPath]);
    } catch (error) {
      console.warn(
        `Error while deleting thumbnails: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }
}
