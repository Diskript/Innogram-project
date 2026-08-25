import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventsService } from "../events/events.service";
import {
  QueryNotificationDto,
  UpdateNotificationPreferencesDto,
} from "@repo/shared-types";

@Injectable()
export class NotificationsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async create(
    userId: string,
    actorId: string,
    type: string,
    entityId?: string | null,
  ) {
    const prefKey = this.prefKeyForType(type);
    if (prefKey) {
      const prefs =
        await this.prismaService.client.notificationPreference.findUnique({
          where: { userId },
        });
      if (prefs && !prefs[prefKey]) {
        return null;
      }
    }

    const notification = await this.prismaService.client.notification.create({
      data: { userId, actorId, type, entityId },
    });

    this.eventsService.emit("notification.created", {
      notificationId: notification.id,
      userId,
      actorId,
      type,
      entityId: entityId ?? null,
    });

    return notification;
  }

  async findByUser(userId: string, query: QueryNotificationDto) {
    const { skip = 0, take = 10, unreadOnly } = query;

    const where: Record<string, unknown> = { userId };
    if (unreadOnly) {
      where.read = false;
    }

    const [notifications, total] = await Promise.all([
      this.prismaService.client.notification.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          actor: {
            select: {
              id: true,
              userName: true,
              displayName: true,
              avatarUrl: true,
            },
          },
        },
      }),
      this.prismaService.client.notification.count({ where }),
    ]);

    return { data: notifications, total, skip, take };
  }

  async markAsRead(notificationId: string, userId: string) {
    const result = await this.prismaService.client.notification.updateMany({
      where: { id: notificationId, userId },
      data: { read: true },
    });

    if (result.count === 0) {
      throw new NotFoundException("Notification not found");
    }

    return { success: true };
  }

  async markAllAsRead(userId: string) {
    const result = await this.prismaService.client.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });

    return { success: true, updated: result.count };
  }

  async getPreferences(userId: string) {
    const prefs =
      await this.prismaService.client.notificationPreference.findUnique({
        where: { userId },
      });

    if (!prefs) {
      return {
        followEnabled: true,
        likeEnabled: true,
        commentEnabled: true,
        mentionEnabled: true,
      };
    }

    return {
      followEnabled: prefs.followEnabled,
      likeEnabled: prefs.likeEnabled,
      commentEnabled: prefs.commentEnabled,
      mentionEnabled: prefs.mentionEnabled,
    };
  }

  async updatePreferences(
    userId: string,
    dto: UpdateNotificationPreferencesDto,
  ) {
    const prefs = await this.prismaService.client.notificationPreference.upsert(
      {
        where: { userId },
        create: { userId, ...dto },
        update: { ...dto },
      },
    );

    return {
      followEnabled: prefs.followEnabled,
      likeEnabled: prefs.likeEnabled,
      commentEnabled: prefs.commentEnabled,
      mentionEnabled: prefs.mentionEnabled,
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prismaService.client.notification.count({
      where: { userId, read: false },
    });

    return { count };
  }

  private prefKeyForType(
    type: string,
  ):
    | "followEnabled"
    | "likeEnabled"
    | "commentEnabled"
    | "mentionEnabled"
    | null {
    switch (type) {
      case "FOLLOW":
        return "followEnabled";
      case "LIKE":
        return "likeEnabled";
      case "COMMENT":
        return "commentEnabled";
      case "MENTION":
        return "mentionEnabled";
      default:
        return null;
    }
  }
}
