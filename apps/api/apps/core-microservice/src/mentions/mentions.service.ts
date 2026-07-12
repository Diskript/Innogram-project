import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { extractMentions } from "@repo/shared-types";

@Injectable()
export class MentionsService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async resolveMentionedUsers(
    usernames: string[],
  ): Promise<{ id: string; userName: string }[]> {
    if (usernames.length === 0) return [];
    return this.prismaService.client.user.findMany({
      where: { userName: { in: usernames }, deleted: false },
      select: { id: true, userName: true },
    });
  }

  async notifyMentionedUsers(
    actorId: string,
    entityId: string,
    content: string,
  ) {
    const usernames = extractMentions(content);
    if (usernames.length === 0) return;

    const users = await this.resolveMentionedUsers(usernames);

    for (const user of users) {
      if (user.id === actorId) continue;
      await this.notificationsService.create(
        user.id,
        actorId,
        "MENTION",
        entityId,
      );
    }
  }
}
