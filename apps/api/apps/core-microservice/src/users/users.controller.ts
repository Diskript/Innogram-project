import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
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
import { UsersService } from "./users.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  CurrentUser,
  JwtUser,
  QueryUserDto,
  SearchUserDto,
  UpdateUserDto,
} from "@repo/shared-types";

@ApiTags("Users")
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "Get all users with pagination" })
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
  @ApiResponse({ status: 200, description: "Users retrieved successfully" })
  async findAll(@Query() query: QueryUserDto) {
    return this.usersService.findAll(query.skip, query.take);
  }

  @Get("search")
  @ApiOperation({ summary: "Search users by username or display name" })
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
  @ApiResponse({ status: 200, description: "Users retrieved successfully" })
  async search(@Query() query: SearchUserDto) {
    return this.usersService.search(query);
  }

  @Get(":id/followers")
  @ApiOperation({ summary: "Get followers of a user" })
  @ApiParam({ name: "id", type: String, description: "User UUID" })
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
  @ApiResponse({ status: 200, description: "Followers retrieved successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  async getUserFollowers(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: QueryUserDto,
  ) {
    return this.usersService.getUserFollowers(id, query.skip, query.take);
  }

  @Get(":id/following")
  @ApiOperation({ summary: "Get users that a user follows" })
  @ApiParam({ name: "id", type: String, description: "User UUID" })
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
  @ApiResponse({
    status: 200,
    description: "Following list retrieved successfully",
  })
  @ApiResponse({ status: 404, description: "User not found" })
  async getUserFollowing(
    @Param("id", ParseUUIDPipe) id: string,
    @Query() query: QueryUserDto,
  ) {
    return this.usersService.getUserFollowing(id, query.skip, query.take);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a user by ID" })
  @ApiParam({ name: "id", type: String, description: "User UUID" })
  @ApiResponse({ status: 200, description: "User retrieved successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Update own profile" })
  @ApiParam({ name: "id", type: String, description: "User UUID" })
  @ApiResponse({ status: 200, description: "User updated successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  async update(
    @Body() updateUserDto: UpdateUserDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.usersService.update(user.userId, updateUserDto, user.userId);
  }

  @Delete(":id")
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "Delete own account (soft delete)" })
  @ApiParam({ name: "id", type: String, description: "User UUID" })
  @ApiResponse({ status: 200, description: "User deleted successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  async remove(@CurrentUser() user: JwtUser) {
    return this.usersService.remove(user.userId, user.userId);
  }
}
