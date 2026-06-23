import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
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
import { AssetsService } from "./assets.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  CurrentUser,
  JwtUser,
  UploadAssetDto,
} from "@repo/shared-types";

@ApiTags("Assets")
@Controller("assets")
@UseGuards(JwtAuthGuard)
export class AssetsController {
  constructor(private readonly assetsService: AssetsService) {}

  @Post("upload")
  @UseInterceptors(FileInterceptor("file"))
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
  @UseInterceptors(FilesInterceptor("files"))
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
  @UseInterceptors(FileInterceptor("file"))
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
  @UseInterceptors(FilesInterceptor("files"))
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
}
