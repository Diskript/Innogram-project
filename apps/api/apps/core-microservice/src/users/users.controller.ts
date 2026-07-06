import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Query,
} from "@nestjs/common";
import {
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { UsersService } from "./users.service";
import { QueryUserDto, SearchUserDto, UpdateUserDto } from "@repo/shared-types";

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

  @Get(":id")
  @ApiOperation({ summary: "Get a user by ID" })
  @ApiParam({ name: "id", type: String, description: "User UUID" })
  @ApiResponse({ status: 200, description: "User retrieved successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  async findOne(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.findOne(id);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Update a user" })
  @ApiParam({ name: "id", type: String, description: "User UUID" })
  @ApiResponse({ status: 200, description: "User updated successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  async update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() updateUserDto: UpdateUserDto,
  ) {
    return this.usersService.update(id, updateUserDto);
  }

  @Delete(":id")
  @ApiOperation({ summary: "Delete a user (soft delete)" })
  @ApiParam({ name: "id", type: String, description: "User UUID" })
  @ApiResponse({ status: 200, description: "User deleted successfully" })
  @ApiResponse({ status: 404, description: "User not found" })
  async remove(@Param("id", ParseUUIDPipe) id: string) {
    return this.usersService.remove(id);
  }
}
