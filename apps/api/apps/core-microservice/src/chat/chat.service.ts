import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { EventsService } from "../events/events.service";
import {
  CreateConversationDto,
  QueryConversationDto,
  QueryMessageDto,
  SendMessageDto,
  UpdateMessageDto,
  ConversationWithParticipants,
  ParticipantWithUser,
  MessageWithSenderAndAssets,
  MessageAssetRaw,
} from "@repo/shared-types";

@Injectable()
export class ChatService {
  constructor(
    private readonly prismaService: PrismaService,
    private readonly eventsService: EventsService,
  ) {}

  async createConversation(dto: CreateConversationDto, userId: string) {
    const allParticipantIds = [...new Set([userId, ...dto.participantIds])];

    const conversation = await this.prismaService.client.conversation.create({
      data: {
        name: dto.name,
        isGroup: dto.isGroup ?? dto.participantIds.length > 1,
        participants: {
          createMany: {
            data: allParticipantIds.map((pid) => ({
              userId: pid,
              role: pid === userId ? "ADMIN" : "MEMBER",
            })),
          },
        },
      },
      include: {
        participants: {
          include: {
            user: {
              select: {
                id: true,
                userName: true,
                displayName: true,
                avatarUrl: true,
              },
            },
          },
        },
      },
    });

    for (const pid of dto.participantIds) {
      this.eventsService.emit("conversation.created", {
        conversationId: conversation.id,
        userId: pid,
      });
    }

    return this.toConversationResponse(conversation);
  }

  async findUserConversations(userId: string, query: QueryConversationDto) {
    const { skip = 0, take = 20 } = query;

    const participantWhere = {
      userId,
      leftAt: null as Date | null,
    };

    const [participations, total] = await Promise.all([
      this.prismaService.client.conversation_Participant.findMany({
        where: participantWhere,
        skip,
        take,
        orderBy: { joinedAt: "desc" },
        include: {
          conversation: {
            include: {
              participants: {
                include: {
                  user: {
                    select: {
                      id: true,
                      userName: true,
                      displayName: true,
                      avatarUrl: true,
                    },
                  },
                },
              },
              messages: {
                orderBy: { createdAt: "desc" },
                take: 1,
              },
            },
          },
        },
      }),
      this.prismaService.client.conversation_Participant.count({
        where: participantWhere,
      }),
    ]);

    const data = participations.map((p) =>
      this.toConversationResponse(p.conversation),
    );

    return { data, total, skip, take };
  }

  async getConversation(conversationId: string, userId: string) {
    await this.assertParticipant(conversationId, userId);

    const conversation =
      await this.prismaService.client.conversation.findUnique({
        where: { id: conversationId },
        include: {
          participants: {
            include: {
              user: {
                select: {
                  id: true,
                  userName: true,
                  displayName: true,
                  avatarUrl: true,
                },
              },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
          },
        },
      });

    if (!conversation) {
      throw new NotFoundException("Conversation not found");
    }

    return this.toConversationResponse(conversation);
  }

  async sendMessage(
    conversationId: string,
    dto: SendMessageDto,
    userId: string,
  ) {
    await this.assertParticipant(conversationId, userId);

    const message = await this.prismaService.client.message.create({
      data: {
        conversationId,
        senderId: userId,
        content: dto.content,
        ...(dto.assetIds?.length
          ? {
              assets: {
                create: dto.assetIds.map((assetId) => ({ assetId })),
              },
            }
          : {}),
      },
      include: {
        sender: {
          select: {
            id: true,
            userName: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        assets: {
          include: {
            asset: {
              select: {
                id: true,
                fileName: true,
                fileType: true,
                fileSize: true,
                thumbnailPath: true,
              },
            },
          },
        },
      },
    });

    this.eventsService.emit("message.sent", {
      conversationId,
      messageId: message.id,
      senderId: userId,
    });

    return this.toMessageResponse(message);
  }

  async getMessages(
    conversationId: string,
    userId: string,
    query: QueryMessageDto,
  ) {
    await this.assertParticipant(conversationId, userId);

    const { skip = 0, take = 50 } = query;

    const where = { conversationId };

    const [messages, total] = await Promise.all([
      this.prismaService.client.message.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: "desc" },
        include: {
          sender: {
            select: {
              id: true,
              userName: true,
              displayName: true,
              avatarUrl: true,
            },
          },
          assets: {
            include: {
              asset: {
                select: {
                  id: true,
                  fileName: true,
                  fileType: true,
                  fileSize: true,
                  thumbnailPath: true,
                },
              },
            },
          },
        },
      }),
      this.prismaService.client.message.count({ where }),
    ]);

    return {
      data: messages.map((m) => this.toMessageResponse(m)),
      total,
      skip,
      take,
    };
  }

  async updateMessage(
    messageId: string,
    dto: UpdateMessageDto,
    userId: string,
  ) {
    const message = await this.prismaService.client.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException("Message not found");
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException("You can only edit your own messages");
    }

    const updated = await this.prismaService.client.message.update({
      where: { id: messageId },
      data: { content: dto.content },
      include: {
        sender: {
          select: {
            id: true,
            userName: true,
            displayName: true,
            avatarUrl: true,
          },
        },
        assets: {
          include: {
            asset: {
              select: {
                id: true,
                fileName: true,
                fileType: true,
                fileSize: true,
                thumbnailPath: true,
              },
            },
          },
        },
      },
    });

    this.eventsService.emit("message.updated", {
      conversationId: updated.conversationId,
      messageId: updated.id,
    });

    return this.toMessageResponse(updated);
  }

  async deleteMessage(messageId: string, userId: string) {
    const message = await this.prismaService.client.message.findUnique({
      where: { id: messageId },
    });

    if (!message) {
      throw new NotFoundException("Message not found");
    }
    if (message.senderId !== userId) {
      throw new ForbiddenException("You can only delete your own messages");
    }

    await this.prismaService.client.message.delete({
      where: { id: messageId },
    });

    this.eventsService.emit("message.deleted", {
      conversationId: message.conversationId,
      messageId,
    });

    return { success: true };
  }

  private async assertParticipant(
    conversationId: string,
    userId: string,
  ): Promise<void> {
    const participant =
      await this.prismaService.client.conversation_Participant.findUnique({
        where: {
          conversationId_userId: { conversationId, userId },
        },
      });

    if (!participant || participant.leftAt) {
      throw new ForbiddenException(
        "You are not a participant in this conversation",
      );
    }
  }

  private toConversationResponse(conversation: ConversationWithParticipants) {
    const messages = conversation.messages ?? [];
    const lastMessage = messages.length > 0 ? messages[0] : undefined;

    return {
      id: conversation.id,
      name: conversation.name,
      isGroup: conversation.isGroup,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      participants: conversation.participants.map((p: ParticipantWithUser) => ({
        id: p.id,
        userId: p.userId,
        role: p.role,
        joinedAt: p.joinedAt,
        leftAt: p.leftAt,
        user: p.user,
      })),
      ...(lastMessage
        ? {
            lastMessage: {
              id: lastMessage.id,
              senderId: lastMessage.senderId,
              content: lastMessage.content,
              createdAt: lastMessage.createdAt,
            },
          }
        : {}),
    };
  }

  private toMessageResponse(message: MessageWithSenderAndAssets) {
    return {
      id: message.id,
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      sender: message.sender,
      assets: message.assets?.map((ma: MessageAssetRaw) => ({
        id: ma.id,
        assetId: ma.assetId,
        fileName: ma.asset.fileName,
        fileType: ma.asset.fileType,
        fileSize: ma.asset.fileSize,
        thumbnailPath: ma.asset.thumbnailPath,
        mimeType: ma.asset.fileType,
      })),
    };
  }
}
