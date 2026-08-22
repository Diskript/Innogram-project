import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventsService } from "../events/events.service";
import { QueryNotificationDto } from "@repo/shared-types";

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

  async getUnreadCount(userId: string) {
    const count = await this.prismaService.client.notification.count({
      where: { userId, read: false },
    });

    return { count };
  }
}
