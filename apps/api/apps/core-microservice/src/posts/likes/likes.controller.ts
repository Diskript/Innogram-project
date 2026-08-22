import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  ParseUUIDPipe,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { LikesService } from "./likes.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { CurrentUser, JwtUser, QueryPostLikesDto } from "@repo/shared-types";

@ApiTags("Likes")
@Controller("posts/:postId/likes")
export class LikesController {
  constructor(private readonly likesService: LikesService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Like or unlike a post" })
  @ApiParam({ name: "postId", type: String, description: "Post UUID" })
  @ApiResponse({ status: 201, description: "Like toggled" })
  async toggleLike(
    @Param("postId", ParseUUIDPipe) postId: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.likesService.togglePostLike(user.userId, postId);
  }

  @Get()
  @ApiOperation({ summary: "Get users who liked a post" })
  @ApiParam({ name: "postId", type: String, description: "Post UUID" })
  @ApiResponse({ status: 200, description: "Liked users retrieved" })
  async getLikes(
    @Param("postId", ParseUUIDPipe) postId: string,
    @Query() query: QueryPostLikesDto,
  ) {
    return this.likesService.getPostLikedUsers(postId, query);
  }
}
