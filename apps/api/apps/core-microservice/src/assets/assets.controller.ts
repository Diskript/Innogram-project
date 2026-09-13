import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UploadedFiles,
  UseGuards,
  UseInterceptors,
} from "@nestjs/common";
import { FileInterceptor, FilesInterceptor } from "@nestjs/platform-express";
import {
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { diskStorage as multerDiskStorage } from "multer";
import { join } from "path";
import * as fs from "fs";
import { AssetsService } from "./assets.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { UPLOAD_ROOT } from "./file.service";
import { isImage, isVideo } from "./utils/mime-types";
import { generateFileName, getStoragePath } from "./utils/file-naming";
import { Request, Response } from "express";
import {
  CurrentUser,
  JwtUser,
  UpdateAssetDto,
  UploadAssetDto,
} from "@repo/shared-types";

const MAX_FILES = 10;
const MAX_UPLOAD_BYTES = 100 * 1024 * 1024; // videos dominate; images are capped per-type by FileService.validateFile

type UploadCallback = (error: Error | null, acceptFile: boolean) => void;

/**
 * Builds a multer interceptor backed by disk storage: files stream
 * straight to the staging directory (inside UPLOAD_ROOT) instead of
 * being buffered in memory, then FileService moves them to their
 * visibility-scoped final location.
 */
export const createUploadInterceptor = (
  field: string,
  multi = false,
  maxBytes = MAX_UPLOAD_BYTES,
) => {
  const storage = multerDiskStorage({
    destination: (
      _req: unknown,
      _file: unknown,
      cb: (error: Error | null, destination: string) => void,
    ) => {
      // Multer only pre-creates the directory when `destination` is a
      // string; with a callback it streams straight into the dir, so the
      // staging tree has to exist beforehand.
      const stagingDir = join(UPLOAD_ROOT, getStoragePath());
      fs.mkdirSync(stagingDir, { recursive: true });
      cb(null, stagingDir);
    },
    filename: (
      _req: unknown,
      file: { originalname: string },
      cb: (error: Error | null, filename: string) => void,
    ) => cb(null, generateFileName(file.originalname)),
  });
  const options = {
    storage,
    fileFilter: (
      _req: unknown,
      file: { mimetype: string },
      cb: UploadCallback,
    ) => {
      const ok = isImage(file.mimetype) || isVideo(file.mimetype);
      cb(ok ? null : new BadRequestException("Unsupported file type"), ok);
    },
    limits: { files: MAX_FILES, fileSize: maxBytes },
  };
  return multi
    ? FilesInterceptor(field, MAX_FILES, options)
    : FileInterceptor(field, options);
};

export const uploadSingle = createUploadInterceptor("file");
export const uploadMultiple = createUploadInterceptor("files", true);
export const uploadConversationSingle = createUploadInterceptor("file");
export const uploadConversationMultiple = createUploadInterceptor(
  "files",
  true,
);

@ApiTags("Assets")
@Controller("assets")
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post("upload")
  @UseInterceptors(uploadSingle)
  @ApiOperation({ summary: "Upload a single asset" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        title: { type: "string" },
        description: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        visibility: {
          type: "string",
          enum: ["PUBLIC", "FOLLOWERS", "PRIVATE"],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Asset uploaded successfully" })
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() uploadAssetDto: UploadAssetDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.assetsService.uploadAsset(file, user, uploadAssetDto);
  }

  @Post("upload/multiple")
  @UseInterceptors(uploadMultiple)
  @ApiOperation({ summary: "Upload multiple assets" })
  @ApiConsumes("multipart/form-data")
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
        title: { type: "string" },
        description: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        visibility: {
          type: "string",
          enum: ["PUBLIC", "FOLLOWERS", "PRIVATE"],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Assets uploaded successfully" })
  async uploadMultiple(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() uploadAssetDto: UploadAssetDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.assetsService.uploadMultipleAssets(files, user, uploadAssetDto);
  }

  @Post("conversation/:conversationId")
  @UseInterceptors(uploadConversationSingle)
  @ApiOperation({ summary: "Upload an asset to a conversation" })
  @ApiConsumes("multipart/form-data")
  @ApiParam({
    name: "conversationId",
    type: String,
    description: "Conversation UUID",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        file: { type: "string", format: "binary" },
        title: { type: "string" },
        description: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        visibility: {
          type: "string",
          enum: ["PUBLIC", "FOLLOWERS", "PRIVATE"],
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: "Asset uploaded to conversation" })
  async uploadConversation(
    @UploadedFile() file: Express.Multer.File,
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Body() uploadAssetDto: UploadAssetDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.assetsService.uploadConversationAsset(
      file,
      user,
      conversationId,
      uploadAssetDto,
    );
  }

  @Post("conversation/:conversationId/multiple")
  @UseInterceptors(uploadConversationMultiple)
  @ApiOperation({ summary: "Upload multiple assets to a conversation" })
  @ApiConsumes("multipart/form-data")
  @ApiParam({
    name: "conversationId",
    type: String,
    description: "Conversation UUID",
  })
  @ApiBody({
    schema: {
      type: "object",
      properties: {
        files: {
          type: "array",
          items: { type: "string", format: "binary" },
        },
        title: { type: "string" },
        description: { type: "string" },
        tags: { type: "array", items: { type: "string" } },
        visibility: {
          type: "string",
          enum: ["PUBLIC", "FOLLOWERS", "PRIVATE"],
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: "Assets uploaded to conversation",
  })
  async uploadMultipleConversation(
    @UploadedFiles() files: Express.Multer.File[],
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @Body() uploadAssetDto: UploadAssetDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.assetsService.uploadMultipleConversationAssets(
      files,
      user,
      conversationId,
      uploadAssetDto,
    );
  }

  @Get(":id")
  @ApiOperation({ summary: "Get asset by ID" })
  @ApiParam({ name: "id", type: String, description: "Asset UUID" })
  @ApiResponse({ status: 200, description: "Asset retrieved successfully" })
  @ApiResponse({ status: 404, description: "Asset not found" })
  async findOne(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.assetsService.getAsset(id, user);
  }

  @Get("user/:userId")
  @ApiOperation({ summary: "Get assets by user ID" })
  @ApiParam({ name: "userId", type: String, description: "User UUID" })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
  })
  @ApiResponse({ status: 200, description: "User assets retrieved" })
  async findByUser(
    @Param("userId", ParseUUIDPipe) userId: string,
    @CurrentUser() user: JwtUser,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.assetsService.getUserAssets(
      user,
      userId,
      page ?? 1,
      limit ?? 20,
    );
  }

  @Get("conversation/:conversationId")
  @ApiOperation({ summary: "Get assets in a conversation" })
  @ApiParam({
    name: "conversationId",
    type: String,
    description: "Conversation UUID",
  })
  @ApiQuery({
    name: "page",
    required: false,
    type: Number,
    description: "Page number",
  })
  @ApiQuery({
    name: "limit",
    required: false,
    type: Number,
    description: "Items per page",
  })
  @ApiResponse({ status: 200, description: "Conversation assets retrieved" })
  async findByConversation(
    @Param("conversationId", ParseUUIDPipe) conversationId: string,
    @CurrentUser() user: JwtUser,
    @Query("page") page?: number,
    @Query("limit") limit?: number,
  ) {
    return this.assetsService.getConversationAssets(
      user,
      conversationId,
      page ?? 1,
      limit ?? 20,
    );
  }

  @Get(":id/download")
  @ApiOperation({ summary: "Download/stream an asset" })
  @ApiParam({ name: "id", type: String, description: "Asset UUID" })
  @ApiResponse({ status: 200, description: "Asset streamed" })
  @ApiResponse({ status: 404, description: "Asset not found" })
  async download(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    return this.assetsService.downloadAsset(id, user, req, res);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update asset metadata" })
  @ApiParam({ name: "id", type: String, description: "Asset UUID" })
  @ApiResponse({ status: 200, description: "Asset updated successfully" })
  @ApiResponse({ status: 404, description: "Asset not found" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateAssetDto: UpdateAssetDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.assetsService.updateAsset(id, user, updateAssetDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete an asset" })
  @ApiParam({ name: "id", type: String, description: "Asset UUID" })
  @ApiResponse({ status: 200, description: "Asset deleted successfully" })
  @ApiResponse({ status: 404, description: "Asset not found" })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.assetsService.deleteAsset(id, user);
  }
}
