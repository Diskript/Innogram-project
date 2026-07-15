import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger } from "@nestjs/common";
import { WsAuthService } from "./ws.auth";

interface AuthenticatedSocket extends Socket {
  data: { userId: string };
}

@WebSocketGateway({
  namespace: "/ws",
  cors: { origin: "*", credentials: true },
  transports: ["websocket", "polling"],
})
export class WsGateway implements OnGatewayConnection, OnGatewayDisconnect {
  private readonly logger = new Logger(WsGateway.name);
  private userSockets = new Map<string, Set<string>>();

  @WebSocketServer()
  server!: Server;

  constructor(private readonly wsAuthService: WsAuthService) {}

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
    if (!userId) return;

    const sockets = this.userSockets.get(userId);
    if (sockets) {
      sockets.delete(client.id);
      if (sockets.size === 0) {
        this.userSockets.delete(userId);
      }
    }

    this.logger.log(`WS client ${client.id} disconnected (user ${userId})`);
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
      this.server
        .to(`conversation:${conversationId}`)
        .emit(event, data);
    }
  }

  getUserSocketCount(userId: string): number {
    return this.userSockets.get(userId)?.size ?? 0;
  }
}
