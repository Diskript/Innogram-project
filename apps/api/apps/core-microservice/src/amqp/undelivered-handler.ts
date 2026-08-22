import { Injectable, OnModuleInit } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventsService } from "../events/events.service";
import { NotificationsService } from "../notifications/notifications.service";

@Injectable()
export class UndeliveredHandler implements OnModuleInit {
  constructor(
    private readonly eventsService: EventsService,
    private readonly prismaService: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  onModuleInit(): void {
    this.eventsService.on("message.undelivered", async (payload: unknown) => {
      await this.onUndelivered(payload as Record<string, unknown>);
    });
  }

  async onUndelivered(payload: Record<string, unknown>): Promise<void> {
    const conversationId = payload.conversationId as string;
    const senderId = payload.senderId as string;
    const messageId = payload.messageId as string;

    const participants =
      await this.prismaService.client.conversation_Participant.findMany({
        where: { conversationId, leftAt: null },
        select: { userId: true },
      });

    for (const p of participants) {
      if (p.userId !== senderId) {
        await this.notificationsService.create(
          p.userId,
          senderId,
          "message_undelivered",
          messageId,
        );
      }
    }
  }
}
