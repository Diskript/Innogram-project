import { Controller, Get, Param, Post } from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { ArchiveService } from "./archive.service";
import { CurrentUser, JwtUser } from "@repo/shared-types";

@ApiTags("Archive")
@Controller("archive")
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @Post(":id/archive")
  @ApiOperation({ summary: "Archive a post" })
  @ApiParam({ name: "id", type: String, description: "Post UUID" })
  @ApiResponse({ status: 200, description: "Post archived successfully" })
  @ApiResponse({ status: 404, description: "Post not found" })
  async archive(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.archiveService.archivePost(user, id);
  }

  @Post(":id/unarchive")
  @ApiOperation({ summary: "Unarchive a post" })
  @ApiParam({ name: "id", type: String, description: "Post UUID" })
  @ApiResponse({ status: 200, description: "Post unarchived successfully" })
  @ApiResponse({ status: 404, description: "Post not found" })
  async unArchive(@CurrentUser() user: JwtUser, @Param("id") id: string) {
    return this.archiveService.unArchive(user, id);
  }

  @Get()
  @ApiOperation({ summary: "Get all archived posts" })
  @ApiResponse({ status: 200, description: "Archived posts retrieved" })
  async getArchived(@CurrentUser() user: JwtUser) {
    return this.archiveService.getArchived(user);
  }
}
