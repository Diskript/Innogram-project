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
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { PostsService } from "./posts.service";
import { CreatePostDto, QueryPostDto, UpdatePostDto } from "@repo/shared-types";

@ApiTags("Posts")
@Controller("posts")
export class PostsController {
  constructor(private readonly postsService: PostsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new post" })
  @ApiResponse({ status: 201, description: "Post created successfully" })
  @ApiResponse({ status: 400, description: "Invalid input" })
  async create(@Body() createPostDto: CreatePostDto) {
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
  async findAll(@Query() query: QueryPostDto) {
    return this.postsService.findAll(query);
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
  @ApiOperation({ summary: "Update a post" })
  @ApiParam({ name: "id", type: String, description: "Post UUID" })
  @ApiResponse({ status: 200, description: "Post updated successfully" })
  @ApiResponse({ status: 404, description: "Post not found" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updatePostDto: UpdatePostDto,
  ) {
    return this.postsService.update(id, updatePostDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a post (soft delete by archiving)" })
  @ApiParam({ name: "id", type: String, description: "Post UUID" })
  @ApiResponse({ status: 204, description: "Post archived successfully" })
  @ApiResponse({ status: 404, description: "Post not found" })
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.postsService.remove(id);
  }
}
