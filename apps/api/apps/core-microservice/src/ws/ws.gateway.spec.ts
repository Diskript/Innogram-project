import { Test, TestingModule } from "@nestjs/testing";
import { WsGateway } from "./ws.gateway";
import { WsAuthService } from "./ws.auth";
import { TypingService } from "./typing.service";
import { EventsService } from "../events/events.service";
import { PrismaService } from "../prisma/prisma.service";
import { UnauthorizedException } from "@nestjs/common";

const mockPrismaClient = {
  conversation_Participant: {
    findUnique: jest.fn(),
    findMany: jest.fn().mockResolvedValue([]),
  },
};

describe("WsGateway", () => {
  let gateway: WsGateway;
  let wsAuthService: WsAuthService;
  let module: TestingModule;

  const mockSocket = {
    id: "socket-1",
    handshake: { auth: {} },
    data: {},
    join: jest.fn(),
    leave: jest.fn(),
    disconnect: jest.fn(),
  };

  const mockSocketsLeave = jest.fn();

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    except: jest.fn().mockReturnThis(),
    emit: jest.fn(),
    in: jest.fn().mockReturnThis(),
    socketsLeave: mockSocketsLeave,
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    module = await Test.createTestingModule({
      providers: [
        WsGateway,
        {
          provide: WsAuthService,
          useValue: { verify: jest.fn() },
        },
        {
          provide: EventsService,
          useValue: { on: jest.fn(), emit: jest.fn() },
        },
        {
          provide: PrismaService,
          useValue: { client: mockPrismaClient },
        },
        TypingService,
      ],
    }).compile();

    gateway = module.get<WsGateway>(WsGateway);
    wsAuthService = module.get<WsAuthService>(WsAuthService);
    gateway.server = mockServer as any;
  });

  describe("handleConnection", () => {
    it("should disconnect client without token", () => {
      mockSocket.handshake.auth = {};
      gateway.handleConnection(mockSocket as any);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it("should disconnect client with invalid token", () => {
      mockSocket.handshake.auth = { token: "bad" };
      jest.spyOn(wsAuthService, "verify").mockImplementation(() => {
        throw new UnauthorizedException();
      });
      gateway.handleConnection(mockSocket as any);
      expect(mockSocket.disconnect).toHaveBeenCalled();
    });

    it("should authenticate and join room for valid token", () => {
      mockSocket.handshake.auth = { token: "valid" };
      jest.spyOn(wsAuthService, "verify").mockReturnValue({ userId: "user-1" });
      gateway.handleConnection(mockSocket as any);
      expect(mockSocket.join).toHaveBeenCalledWith("user:user-1");
      expect(mockSocket.disconnect).not.toHaveBeenCalled();
    });
  });

  describe("sendToUser", () => {
    it("should emit to user room", () => {
      gateway.sendToUser("user-1", "test", { hello: "world" });
      expect(mockServer.to).toHaveBeenCalledWith("user:user-1");
      expect(mockServer.emit).toHaveBeenCalledWith("test", { hello: "world" });
    });
  });

  describe("sendToConversation", () => {
    it("should emit to conversation room", () => {
      gateway.sendToConversation("conv-1", "message", { text: "hi" });
      expect(mockServer.to).toHaveBeenCalledWith("conversation:conv-1");
      expect(mockServer.emit).toHaveBeenCalledWith("message", { text: "hi" });
    });

    it("should exclude sender when specified", () => {
      gateway.sendToConversation("conv-1", "message", { text: "hi" }, "user-1");
      expect(mockServer.to).toHaveBeenCalledWith("conversation:conv-1");
      expect(mockServer.except).toHaveBeenCalledWith("user:user-1");
      expect(mockServer.emit).toHaveBeenCalledWith("message", { text: "hi" });
    });
  });

  describe("getUserSocketCount", () => {
    it("should return 0 for unknown user", () => {
      expect(gateway.getUserSocketCount("nobody")).toBe(0);
    });

    it("should return socket count for connected user", () => {
      mockSocket.handshake.auth = { token: "valid" };
      jest.spyOn(wsAuthService, "verify").mockReturnValue({ userId: "user-1" });
      gateway.handleConnection(mockSocket as any);
      expect(gateway.getUserSocketCount("user-1")).toBe(1);
    });
  });

  describe("join:conversation", () => {
    it("should join the conversation room when user is a participant", async () => {
      (
        mockPrismaClient.conversation_Participant.findUnique as jest.Mock
      ).mockResolvedValue({
        userId: "user-1",
        conversationId: "conv-1",
        leftAt: null,
      });
      const socket = {
        ...mockSocket,
        data: { userId: "user-1" },
        join: jest.fn(),
      } as any;
      await gateway.handleJoinConversation(socket, {
        conversationId: "conv-1",
      });
      expect(socket.join).toHaveBeenCalledWith("conversation:conv-1");
    });

    it("should NOT join when user is not a participant", async () => {
      (
        mockPrismaClient.conversation_Participant.findUnique as jest.Mock
      ).mockResolvedValue(null);
      const socket = {
        ...mockSocket,
        data: { userId: "user-1" },
        join: jest.fn(),
      } as any;
      await gateway.handleJoinConversation(socket, {
        conversationId: "conv-1",
      });
      expect(socket.join).not.toHaveBeenCalled();
    });

    it("should NOT join when participant has left", async () => {
      (
        mockPrismaClient.conversation_Participant.findUnique as jest.Mock
      ).mockResolvedValue({
        userId: "user-1",
        conversationId: "conv-1",
        leftAt: new Date(),
      });
      const socket = {
        ...mockSocket,
        data: { userId: "user-1" },
        join: jest.fn(),
      } as any;
      await gateway.handleJoinConversation(socket, {
        conversationId: "conv-1",
      });
      expect(socket.join).not.toHaveBeenCalled();
    });
  });

  describe("leave:conversation", () => {
    it("should leave the conversation room", () => {
      const socket = { ...mockSocket, leave: jest.fn() } as any;
      gateway.handleLeaveConversation(socket, { conversationId: "conv-1" });
      expect(socket.leave).toHaveBeenCalledWith("conversation:conv-1");
    });
  });

  describe("typing:start", () => {
    it("should broadcast typing:update when service returns broadcast", () => {
      jest
        .spyOn(gateway["typingService"], "startTyping")
        .mockReturnValue("broadcast");
      const socket = { ...mockSocket, data: { userId: "user-1" } } as any;
      gateway.handleTypingStart(socket, { conversationId: "conv-1" });
      expect(mockServer.to).toHaveBeenCalledWith("conversation:conv-1");
      expect(mockServer.except).toHaveBeenCalledWith("user:user-1");
      expect(mockServer.emit).toHaveBeenCalledWith("typing:update", {
        userId: "user-1",
        conversationId: "conv-1",
      });
    });

    it("should NOT broadcast when service returns throttled", () => {
      jest
        .spyOn(gateway["typingService"], "startTyping")
        .mockReturnValue("throttled");
      const socket = { ...mockSocket, data: { userId: "user-1" } } as any;
      gateway.handleTypingStart(socket, { conversationId: "conv-1" });
      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe("typing:stop", () => {
    it("should broadcast typing:stop when service returns true", () => {
      jest.spyOn(gateway["typingService"], "stopTyping").mockReturnValue(true);
      const socket = { ...mockSocket, data: { userId: "user-1" } } as any;
      gateway.handleTypingStop(socket, { conversationId: "conv-1" });
      expect(mockServer.to).toHaveBeenCalledWith("conversation:conv-1");
      expect(mockServer.except).toHaveBeenCalledWith("user:user-1");
      expect(mockServer.emit).toHaveBeenCalledWith("typing:stop", {
        userId: "user-1",
        conversationId: "conv-1",
      });
    });

    it("should NOT broadcast when service returns false", () => {
      jest.spyOn(gateway["typingService"], "stopTyping").mockReturnValue(false);
      const socket = { ...mockSocket, data: { userId: "user-1" } } as any;
      gateway.handleTypingStop(socket, { conversationId: "conv-1" });
      expect(mockServer.emit).not.toHaveBeenCalled();
    });
  });

  describe("onModuleInit", () => {
    it("should listen for message.sent and broadcast typing:stop", () => {
      const eventsService = module.get<EventsService>(EventsService);
      const onSpy = jest.spyOn(eventsService, "on");
      gateway.onModuleInit();
      expect(onSpy).toHaveBeenCalledWith("message.sent", expect.any(Function));

      const listener = onSpy.mock.calls[0][1];
      jest
        .spyOn(gateway["typingService"], "onMessageSent")
        .mockReturnValue(true);
      listener({ conversationId: "conv-1", senderId: "user-1" });
      expect(mockServer.to).toHaveBeenCalledWith("conversation:conv-1");
      expect(mockServer.except).toHaveBeenCalledWith("user:user-1");
      expect(mockServer.emit).toHaveBeenCalledWith("typing:stop", {
        userId: "user-1",
        conversationId: "conv-1",
      });
    });
  });

  describe("real-time chat events", () => {
    const getHandler = (eventName: string) => {
      const eventsService = module.get<EventsService>(EventsService);
      const onSpy = jest.spyOn(eventsService, "on");
      gateway.onModuleInit();
      return onSpy.mock.calls.find(([name]) => name === eventName)?.[1] as (
        p: unknown,
      ) => void;
    };

    it("forwards conversation.created to the participant user room", () => {
      const handler = getHandler("conversation.created");

      handler({ conversationId: "conv-1", userId: "user-2" });

      expect(mockServer.to).toHaveBeenCalledWith("user:user-2");
      expect(mockServer.emit).toHaveBeenCalledWith("conversation.created", {
        conversationId: "conv-1",
        userId: "user-2",
      });
    });

    it("forwards participant.added to the conversation room", () => {
      const handler = getHandler("participant.added");

      handler({ conversationId: "conv-1", userId: "user-2" });

      expect(mockServer.to).toHaveBeenCalledWith("conversation:conv-1");
      expect(mockServer.emit).toHaveBeenCalledWith("participant.added", {
        conversationId: "conv-1",
        userId: "user-2",
      });
    });

    it("broadcasts participant.left and removes the user's sockets from the room", () => {
      const handler = getHandler("participant.left");

      (
        gateway as unknown as { userSockets: Map<string, Set<string>> }
      ).userSockets.set("user-2", new Set(["socket-9"]));
      const socket = { leave: jest.fn() };
      (mockServer as unknown as { sockets: unknown }).sockets = {
        sockets: { get: jest.fn().mockReturnValue(socket) },
      };

      handler({ conversationId: "conv-1", userId: "user-2" });

      expect(mockServer.to).toHaveBeenCalledWith("conversation:conv-1");
      expect(socket.leave).toHaveBeenCalledWith("conversation:conv-1");
    });

    it("broadcasts conversation.deleted then clears the room", () => {
      const handler = getHandler("conversation.deleted");

      handler({ conversationId: "conv-1" });

      expect(mockServer.to).toHaveBeenCalledWith("conversation:conv-1");
      expect(mockServer.emit).toHaveBeenCalledWith("conversation.deleted", {
        conversationId: "conv-1",
      });
      expect(mockServer.in).toHaveBeenCalledWith("conversation:conv-1");
      expect(mockSocketsLeave).toHaveBeenCalled();
    });
  });

  describe("presence", () => {
    const flush = () => new Promise((resolve) => setImmediate(resolve));

    const makeClient = (userId: string) => {
      const socket = {
        id: `socket-${userId}`,
        handshake: { auth: { token: "valid" } },
        data: {},
        join: jest.fn(),
        leave: jest.fn(),
        disconnect: jest.fn(),
      };
      jest.spyOn(wsAuthService, "verify").mockReturnValue({ userId });
      return socket;
    };

    it("emits presence:update to the user's conversation rooms on connect", async () => {
      (
        mockPrismaClient.conversation_Participant.findMany as jest.Mock
      ).mockResolvedValue([{ conversationId: "conv-1" }]);

      gateway.handleConnection(makeClient("user-1") as any);
      await flush();

      expect(
        mockPrismaClient.conversation_Participant.findMany,
      ).toHaveBeenCalledWith({
        where: { userId: "user-1", leftAt: null },
        select: { conversationId: true },
      });
      expect(mockServer.to).toHaveBeenCalledWith("conversation:conv-1");
      expect(mockServer.emit).toHaveBeenCalledWith("presence:update", {
        userId: "user-1",
        online: true,
      });
    });

    it("emits offline presence on final disconnect, excluding the user", async () => {
      (
        mockPrismaClient.conversation_Participant.findMany as jest.Mock
      ).mockResolvedValue([{ conversationId: "conv-1" }]);

      const client = makeClient("user-1");
      gateway.handleConnection(client as any);
      await flush();
      gateway.handleDisconnect(client as any);
      await flush();

      expect(mockServer.except).toHaveBeenCalledWith("user:user-1");
      expect(mockServer.emit).toHaveBeenCalledWith("presence:update", {
        userId: "user-1",
        online: false,
      });
    });

    it("emits offline presence only when the last socket disconnects", async () => {
      (
        mockPrismaClient.conversation_Participant.findMany as jest.Mock
      ).mockResolvedValue([{ conversationId: "conv-1" }]);

      const first = makeClient("user-1");
      const second = { ...makeClient("user-1"), id: "socket-user-1-b" };
      gateway.handleConnection(first as any);
      gateway.handleConnection(second as any);
      await flush();
      (mockServer.emit as jest.Mock).mockClear();

      gateway.handleDisconnect(first as any);
      await flush();
      expect(mockServer.emit).not.toHaveBeenCalled();

      gateway.handleDisconnect(second as any);
      await flush();
      expect(mockServer.emit).toHaveBeenCalledWith("presence:update", {
        userId: "user-1",
        online: false,
      });
    });
  });
});
