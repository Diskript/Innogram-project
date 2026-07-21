import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { PostsService } from "./posts.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  CreatePostDto,
  CurrentUser,
  JwtUser,
  QueryPostDto,
  SearchPostDto,
  UpdatePostDto,
} from "@repo/shared-types";

@ApiTags("Posts")
@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Create a new post" })
  @ApiResponse({ status: 201, description: "Post created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  async create(
    @Body() createPostDto: CreatePostDto,
    @CurrentUser() user: JwtUser,
  ) {
    createPostDto.userId = user.userId;
    return this.postsService.create(createPostDto);
  }

  @Get()
  @ApiOperation({ summary: "Get all posts with pagination" })
  @ApiQuery({
    name: "skip",
    required: false,
    type: Number,
    description: "Number of records to skip",
  })
  @ApiQuery({
    name: "take",
    required: false,
    type: Number,
    description: "Number of records to take",
  })
  @ApiQuery({
    name: "userId",
    required: false,
    type: String,
    description: "Filter by user ID",
  })
  @ApiResponse({ status: 200, description: "Posts retrieved successfully" })
  async findAll(
    @Query() query: QueryPostDto,
    @CurrentUser() currentUser?: JwtUser,
  ) {
    return this.postsService.findAll(query, currentUser);
  }

  @Get("search")
  @ApiOperation({ summary: "Search posts by content or tags" })
  @ApiQuery({
    name: "q",
    required: true,
    type: String,
    description: "Search query",
  })
  @ApiQuery({
    name: "skip",
    required: false,
    type: Number,
    description: "Number of records to skip",
  })
  @ApiQuery({
    name: "take",
    required: false,
    type: Number,
    description: "Number of records to take",
  })
  @ApiResponse({ status: 200, description: "Posts retrieved successfully" })
  async search(@Query() query: SearchPostDto) {
    return this.postsService.search(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a post by ID" })
  @ApiParam({ name: "id", type: String, description: "Post UUID" })
  @ApiResponse({ status: 200, description: "Post retrieved successfully" })
  @ApiResponse({ status: 404, description: "Post not found" })
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.postsService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update a post" })
  @ApiParam({ name: "id", type: String, description: "Post UUID" })
  @ApiResponse({ status: 200, description: "Post updated successfully" })
  @ApiResponse({ status: 404, description: "Post not found" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updatePostDto: UpdatePostDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.postsService.update(id, updatePostDto, user.userId);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Delete a post (soft delete by archiving)" })
  @ApiParam({ name: "id", type: String, description: "Post UUID" })
  @ApiResponse({ status: 204, description: "Post archived successfully" })
  @ApiResponse({ status: 404, description: "Post not found" })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.postsService.remove(id, user.userId);
  }
}
