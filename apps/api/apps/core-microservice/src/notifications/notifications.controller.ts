import {
  Controller,
  Get,
  Param,
  Patch,
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
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser, JwtUser, QueryNotificationDto } from "@repo/shared-types";

@ApiTags("Notifications")
@Controller("notifications")
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: "List notifications for the current user" })
  @ApiResponse({ status: 200, description: "Notifications retrieved" })
  async findAll(
    @Query() query: QueryNotificationDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.notificationsService.findByUser(user.userId, query);
  }

  @Patch(":id/read")
  @ApiOperation({ summary: "Mark a notification as read" })
  @ApiParam({ name: "id", type: String, description: "Notification ID" })
  @ApiResponse({ status: 200, description: "Notification marked as read" })
  @ApiResponse({ status: 404, description: "Notification not found" })
  async markAsRead(
    @Param("id") id: string,
    @CurrentUser() user: JwtUser,
  ) {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Get unread notification count" })
  @ApiResponse({ status: 200, description: "Unread count retrieved" })
  async getUnreadCount(@CurrentUser() user: JwtUser) {
    return this.notificationsService.getUnreadCount(user.userId);
  }
}
