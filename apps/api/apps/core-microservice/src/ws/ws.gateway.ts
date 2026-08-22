import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { OnModuleInit } from "@nestjs/common";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { WsAuthService } from "./ws.auth";
import { TypingService } from "./typing.service";
import { EventsService } from "../events/events.service";
import { PrismaService } from "../prisma/prisma.service";

interface AuthenticatedSocket extends Socket {
  data: { userId: string };
}

@WebSocketGateway({
  namespace: "/ws",
  cors: { origin: "*", credentials: true },
  transports: ["websocket"],
})
export class WsGateway
  implements OnGatewayConnection, OnGatewayDisconnect, OnModuleInit
{
  private readonly logger = new Logger(WsGateway.name);
  private userSockets = new Map<string, Set<string>>();

  @WebSocketServer()
  server!: Server;

  constructor(
    private readonly wsAuthService: WsAuthService,
    private readonly typingService: TypingService,
    private readonly eventsService: EventsService,
    private readonly prismaService: PrismaService,
  ) {}

  handleConnection(client: Socket): void {
    try {
      const token = client.handshake.auth?.token as string | undefined;
      if (!token) {
        this.logger.warn(`Client ${client.id} connected without token`);
        client.disconnect();
        return;
      }

      const { userId } = this.wsAuthService.verify(token);
      (client as AuthenticatedSocket).data.userId = userId;

      const sockets = this.userSockets.get(userId) ?? new Set();
      sockets.add(client.id);
      this.userSockets.set(userId, sockets);

      client.join(`user:${userId}`);

      this.logger.log(`WS client ${client.id} authenticated as ${userId}`);
    } catch {
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket): void {
    const userId = (client as AuthenticatedSocket).data?.userId;
    if (!userId) {
      return;
    }

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`WS client ${client.id} disconnected (user ${userId})`);
  }

  @SubscribeMessage("join:conversation")
  async handleJoinConversation(
    client: AuthenticatedSocket,
    payload: { conversationId: string },
  ): Promise<void> {
    const participant =
      await this.prismaService.client.conversation_Participant.findUnique({
        where: {
          conversationId_userId: {
            conversationId: payload.conversationId,
            userId: client.data.userId,
          },
        },
      });

    if (!participant || participant.leftAt) {
      return;
    }

    client.join(`conversation:${payload.conversationId}`);
  }

  @SubscribeMessage("leave:conversation")
  handleLeaveConversation(
    client: Socket,
    payload: { conversationId: string },
  ): void {
    client.leave(`conversation:${payload.conversationId}`);
  }

  @SubscribeMessage("typing:start")
  handleTypingStart(
    client: AuthenticatedSocket,
    payload: { conversationId: string },
  ): void {
    const result = this.typingService.startTyping(
      client.data.userId,
      payload.conversationId,
      () => {
        this.server
          .to(`conversation:${payload.conversationId}`)
          .except(`user:${client.data.userId}`)
          .emit("typing:stop", {
            userId: client.data.userId,
            conversationId: payload.conversationId,
          });
      },
    );

    if (result === "broadcast") {
      this.server
        .to(`conversation:${payload.conversationId}`)
        .except(`user:${client.data.userId}`)
        .emit("typing:update", {
          userId: client.data.userId,
          conversationId: payload.conversationId,
        });
    }
  }

  @SubscribeMessage("typing:stop")
  handleTypingStop(
    client: AuthenticatedSocket,
    payload: { conversationId: string },
  ): void {
    const hadState = this.typingService.stopTyping(
      client.data.userId,
      payload.conversationId,
    );

    if (hadState) {
      this.server
        .to(`conversation:${payload.conversationId}`)
        .except(`user:${client.data.userId}`)
        .emit("typing:stop", {
          userId: client.data.userId,
          conversationId: payload.conversationId,
        });
    }
  }

  onModuleInit(): void {
    this.eventsService.on("message.sent", (payload: unknown) => {
      const { conversationId, senderId } = payload as {
        conversationId: string;
        senderId: string;
      };

      const hadState = this.typingService.onMessageSent(
        senderId,
        conversationId,
      );

      if (hadState) {
        this.server
          .to(`conversation:${conversationId}`)
          .except(`user:${senderId}`)
          .emit("typing:stop", {
            userId: senderId,
            conversationId,
          });
      }
    });
  }

  sendToUser(userId: string, event: string, data: unknown): void {
    this.server.to(`user:${userId}`).emit(event, data);
  }

  sendToConversation(
    conversationId: string,
    event: string,
    data: unknown,
    excludeUserId?: string,
  ): void {
    if (excludeUserId) {
      this.server
        .to(`conversation:${conversationId}`)
        .except(`user:${excludeUserId}`)
        .emit(event, data);
    } else {
      this.server.to(`conversation:${conversationId}`).emit(event, data);
    }
  }

  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size ?? 0;
  }
}
