import {
  Controller,
  Get,
  Post,
  Param,
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
import { FollowingsService } from "./followings.service";
import { JwtAuthGuard } from "../../auth/jwt-auth.guard";
import { CurrentUser, JwtUser } from "@repo/shared-types";

@ApiTags("Followings")
@Controller("followings")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FollowingsController {
  constructor(private readonly followingsService: FollowingsService) {}

  @Get()
  @ApiOperation({ summary: "Get list of users I follow" })
  @ApiResponse({
    status: 200,
    description: "Followed users retrieved successfully",
  })
  async getFollows(@CurrentUser() user: JwtUser) {
    return this.followingsService.getFollows(user);
  }

  @Get("followers")
  @ApiOperation({ summary: "Get list of my followers" })
  @ApiResponse({ status: 200, description: "Followers retrieved successfully" })
  async getFollowers(@CurrentUser() user: JwtUser) {
    return this.followingsService.getFollowers(user);
  }

  @Post("follow/:id")
  @ApiOperation({ summary: "Follow or unfollow a user" })
  @ApiParam({ name: "id", type: String, description: "Target user UUID" })
  @ApiResponse({ status: 201, description: "Follow/unfollow action performed" })
  @ApiResponse({ status: 400, description: "Invalid request" })
  async followUnfollow(
    @CurrentUser() user: JwtUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.followingsService.followUnfollow(user, id);
  }

  @Post("requests/:userId/accept")
  @ApiOperation({ summary: "Accept a follow request" })
  @ApiParam({
    name: "userId",
    type: String,
    description: "Requester user UUID",
  })
  @ApiResponse({ status: 201, description: "Follow request accepted" })
  @ApiResponse({ status: 400, description: "No pending request found" })
  async acceptFollowRequest(
    @CurrentUser() user: JwtUser,
    @Param("userId", ParseUUIDPipe) requesterUserId: string,
  ) {
    return this.followingsService.acceptFollowRequest(user, requesterUserId);
  }

  @Post("requests/:userId/reject")
  @ApiOperation({ summary: "Reject a follow request" })
  @ApiParam({
    name: "userId",
    type: String,
    description: "Requester user UUID",
  })
  @ApiResponse({ status: 201, description: "Follow request rejected" })
  @ApiResponse({ status: 400, description: "No pending request found" })
  async rejectFollowRequest(
    @CurrentUser() user: JwtUser,
    @Param("userId", ParseUUIDPipe) requesterUserId: string,
  ) {
    return this.followingsService.rejectFollowRequest(user, requesterUserId);
  }

  @Get("requests/incoming")
  @ApiOperation({ summary: "Get pending incoming follow requests" })
  @ApiResponse({ status: 200, description: "Pending requests retrieved" })
  async getPendingRequests(@CurrentUser() user: JwtUser) {
    return this.followingsService.getPendingRequests(user);
  }

  @Get("requests/outgoing")
  @ApiOperation({ summary: "Get my sent follow requests" })
  @ApiResponse({ status: 200, description: "Sent requests retrieved" })
  async getSentRequests(@CurrentUser() user: JwtUser) {
    return this.followingsService.getSentRequests(user);
  }

  @Get("check/:id")
  @ApiOperation({ summary: "Check if I am following a user" })
  @ApiParam({ name: "id", type: String, description: "User UUID to check" })
  @ApiResponse({ status: 200, description: "Follow status returned" })
  async isFollowing(
    @CurrentUser() user: JwtUser,
    @Param("id", ParseUUIDPipe) id: string,
  ) {
    return this.followingsService.isFollowing(user.userId, id);
  }
}
