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
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { CommentsService } from "./comments.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import {
  CreateCommentDto,
  CurrentUser,
  JwtUser,
  QueryCommentDto,
} from "@repo/shared-types";

@ApiTags("Comments")
@Controller()
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Post("posts/:postId/comments")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Create a comment on a post" })
  @ApiParam({ name: "postId", type: String, description: "Post UUID" })
  @ApiResponse({ status: 201, description: "Comment created" })
  async create(
    @Param("postId", ParseUUIDPipe) postId: string,
    @Body() dto: CreateCommentDto,
    @CurrentUser() user: JwtUser,
  ) {
    dto.postId = postId;
    return this.commentsService.create(postId, user.userId, dto);
  }

  @Get("posts/:postId/comments")
  @ApiOperation({ summary: "Get comments for a post" })
  @ApiParam({ name: "postId", type: String, description: "Post UUID" })
  @ApiResponse({ status: 200, description: "Comments retrieved" })
  async findAll(
    @Param("postId", ParseUUIDPipe) postId: string,
    @Query() query: QueryCommentDto,
  ) {
    return this.commentsService.findByPost(postId, query);
  }

  @Patch("comments/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Edit a comment" })
  @ApiParam({ name: "id", type: String, description: "Comment UUID" })
  @ApiResponse({ status: 200, description: "Comment updated" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body("content") content: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.commentsService.update(id, user.userId, content);
  }

  @Delete("comments/:id")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Delete a comment" })
  @ApiParam({ name: "id", type: String, description: "Comment UUID" })
  @ApiResponse({ status: 200, description: "Comment deleted" })
  async remove(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.commentsService.remove(id, user.userId);
  }

  @Post("comments/:id/like")
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Like or unlike a comment" })
  @ApiParam({ name: "id", type: String, description: "Comment UUID" })
  @ApiResponse({ status: 201, description: "Like toggled" })
  async toggleLike(
    @Param("id", ParseUUIDPipe) id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.commentsService.toggleLike(id, user.userId);
  }
}
