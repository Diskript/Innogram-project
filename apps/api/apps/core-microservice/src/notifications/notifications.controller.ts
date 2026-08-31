import {
  Body,
  Controller,
  Get,
  Param,
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
import { NotificationsService } from "./notifications.service";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import {
  CurrentUser,
  JwtUser,
  QueryNotificationDto,
  UpdateNotificationPreferencesDto,
} from "@repo/shared-types";

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
  async markAsRead(@Param("id") id: string, @CurrentUser() user: JwtUser) {
    return this.notificationsService.markAsRead(id, user.userId);
  }

  @Get("preferences")
  @ApiOperation({ summary: "Get notification preferences" })
  @ApiResponse({ status: 200, description: "Preferences retrieved" })
  async getPreferences(@CurrentUser() user: JwtUser) {
    return this.notificationsService.getPreferences(user.userId);
  }

  @Patch("preferences")
  @ApiOperation({ summary: "Update notification preferences" })
  @ApiResponse({ status: 200, description: "Preferences updated" })
  async updatePreferences(
    @Body() dto: UpdateNotificationPreferencesDto,
    @CurrentUser() user: JwtUser,
  ) {
    return this.notificationsService.updatePreferences(user.userId, dto);
  }

  @Post("read-all")
  @ApiOperation({ summary: "Mark all notifications as read" })
  @ApiResponse({ status: 201, description: "All notifications marked as read" })
  async markAllAsRead(@CurrentUser() user: JwtUser) {
    return this.notificationsService.markAllAsRead(user.userId);
  }

  @Get("unread-count")
  @ApiOperation({ summary: "Get unread notification count" })
  @ApiResponse({ status: 200, description: "Unread count retrieved" })
  async getUnreadCount(@CurrentUser() user: JwtUser) {
    return this.notificationsService.getUnreadCount(user.userId);
  }
}
