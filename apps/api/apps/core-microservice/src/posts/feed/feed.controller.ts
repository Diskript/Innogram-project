import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiQuery, ApiResponse, ApiTags } from "@nestjs/swagger";
import { FeedService } from "./feed.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { CurrentUser, JwtUser, QueryFeedDto } from "@repo/shared-types";

@ApiTags("Feed")
@Controller("feed")
@UseGuards(JwtAuthGuard)
export class FeedController {
  constructor(private readonly feedService: FeedService) {}

  @Get()
  @ApiOperation({ summary: "Get paginated feed for current user" })
  @ApiQuery({
    name: "cursor",
    required: false,
    type: String,
    description: "Cursor for pagination (last post ID)",
  })
  @ApiQuery({
    name: "take",
    required: false,
    type: Number,
    description: "Number of posts to return",
    example: 20,
  })
  @ApiResponse({ status: 200, description: "Feed retrieved successfully" })
  async getFeed(
    @CurrentUser() user: JwtUser,
    @Query() query: QueryFeedDto,
  ) {
    return this.feedService.generateFeed(user, query);
  }
}
