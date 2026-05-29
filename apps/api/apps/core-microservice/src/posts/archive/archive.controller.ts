import { Controller, Get, Post } from "@nestjs/common";
import { ArchiveService } from "./archive.service";
import { CurrentUser, JwtUser } from "@repo/shared-types";

@Controller("archive")
export class ArchiveController {
  constructor(private readonly archiveService: ArchiveService) {}

  @Post("unarchive")
  async archive(@CurrentUser() user: JwtUser, postId: string) {
    return this.archiveService.archivePost(user, postId);
  }

  @Post("archive")
  async unArchive(@CurrentUser() user: JwtUser, postId: string) {
    this.archiveService.unArchive(user, postId);
  }

  @Get()
  async getArchived(@CurrentUser() user: JwtUser) {
    return this.archiveService.getArchived(user);
  }
}
