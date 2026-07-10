import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  UseGuards,
} from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from "@nestjs/swagger";
import { ProfileService } from "./profile.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, JwtUser, UpdateUserDto } from "@repo/shared-types";

@ApiTags("Profile")
@Controller("profile")
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Get own profile with full details" })
  @ApiResponse({ status: 200, description: "Profile retrieved" })
  async getProfile(@CurrentUser() user: JwtUser) {
    return this.profileService.getProfile(user.userId);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Update own profile" })
  @ApiResponse({ status: 200, description: "Profile updated" })
  async updateProfile(
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.profileService.updateProfile(user.userId, dto);
  }

  @Get(":username")
  @ApiOperation({ summary: "Get a public profile by username" })
  @ApiParam({ name: "username", type: String, description: "Username" })
  @ApiResponse({ status: 200, description: "Public profile retrieved" })
  @ApiResponse({ status: 404, description: "User not found" })
  async getPublicProfile(@Param("username") username: string) {
    return this.profileService.getPublicProfile(username);
  }
}
