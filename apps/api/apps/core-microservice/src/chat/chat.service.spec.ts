import { Test, TestingModule } from "@nestjs/testing";
import { ChatService } from "./chat.service";
import { PrismaService } from "../prisma/prisma.service";
import { EventsService } from "../events/events.service";
import { ForbiddenException, NotFoundException } from "@nestjs/common";

describe("ChatService", () => {
  let service: ChatService;

  const mockPrisma = {
    conversation: {
      create: jest.fn(),
      findUnique: jest.fn(),
      delete: jest.fn(),
    },
    conversation_Participant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
      update: jest.fn(),
      create: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockEvents = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.resetAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        { provide: PrismaService, useValue: { client: mockPrisma } },
        { provide: EventsService, useValue: mockEvents },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
  });

  describe("createConversation", () => {
    it("should create a conversation with participants", async () => {
      const dto = {
        participantIds: ["user-2"],
        name: "Chat",
        isGroup: false,
      };

      const mockConversation = {
        id: "conv-1",
        name: "Chat",
        isGroup: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [
          {
            id: "p1",
            userId: "user-1",
            role: "ADMIN",
            joinedAt: new Date(),
            leftAt: null,
            user: {
              id: "user-1",
              userName: "alice",
              displayName: "Alice",
              avatarUrl: null,
            },
          },
          {
            id: "p2",
            userId: "user-2",
            role: "MEMBER",
            joinedAt: new Date(),
            leftAt: null,
            user: {
              id: "user-2",
              userName: "bob",
              displayName: "Bob",
              avatarUrl: null,
            },
          },
        ],
        messages: [],
      };

      mockPrisma.conversation.create.mockResolvedValue(mockConversation);

      const result = await service.createConversation(dto, "user-1");

      expect(mockPrisma.conversation.create).toHaveBeenCalled();
      expect(result.id).toBe("conv-1");
      expect(result.participants).toHaveLength(2);
      expect(mockEvents.emit).toHaveBeenCalledWith("conversation.created", {
        conversationId: "conv-1",
        userId: "user-2",
      });
    });
  });

  describe("findUserConversations", () => {
    it("should return paginated conversations", async () => {
      const mockConversation = {
        id: "conv-1",
        name: "Chat",
        isGroup: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [],
        messages: [],
      };

      mockPrisma.conversation_Participant.findMany.mockResolvedValue([
        { conversation: mockConversation },
      ]);
      mockPrisma.conversation_Participant.count.mockResolvedValue(1);

      const result = await service.findUserConversations("user-1", {});

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe("sendMessage", () => {
    it("should create a message", async () => {
      mockPrisma.conversation_Participant.findUnique.mockResolvedValue({
        leftAt: null,
      });

      const mockMessage = {
        id: "msg-1",
        conversationId: "conv-1",
        senderId: "user-1",
        content: "hello",
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: "user-1",
          userName: "alice",
          displayName: "Alice",
          avatarUrl: null,
        },
        assets: [],
      };

      mockPrisma.message.create.mockResolvedValue(mockMessage);

      const result = await service.sendMessage(
        "conv-1",
        { content: "hello" },
        "user-1",
      );

      expect(result.content).toBe("hello");
      expect(mockEvents.emit).toHaveBeenCalledWith("message.sent", {
        conversationId: "conv-1",
        messageId: "msg-1",
        senderId: "user-1",
      });
    });

    it("should throw if not a participant", async () => {
      mockPrisma.conversation_Participant.findUnique.mockResolvedValue(null);
      await expect(
        service.sendMessage("conv-1", { content: "hi" }, "user-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("updateMessage", () => {
    it("should update own message", async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: "msg-1",
        senderId: "user-1",
        conversationId: "conv-1",
      });

      const updated = {
        id: "msg-1",
        conversationId: "conv-1",
        senderId: "user-1",
        content: "edited",
        createdAt: new Date(),
        updatedAt: new Date(),
        sender: {
          id: "user-1",
          userName: "alice",
          displayName: "Alice",
          avatarUrl: null,
        },
        assets: [],
      };

      mockPrisma.message.update.mockResolvedValue(updated);

      const result = await service.updateMessage(
        "msg-1",
        { content: "edited" },
        "user-1",
      );

      expect(result.content).toBe("edited");
      expect(mockEvents.emit).toHaveBeenCalledWith("message.updated", {
        conversationId: "conv-1",
        messageId: "msg-1",
      });
    });

    it("should throw when editing another user's message", async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: "msg-1",
        senderId: "user-2",
      });

      await expect(
        service.updateMessage("msg-1", { content: "hacked" }, "user-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("deleteMessage", () => {
    it("should delete own message", async () => {
      mockPrisma.message.findUnique.mockResolvedValue({
        id: "msg-1",
        senderId: "user-1",
        conversationId: "conv-1",
      });
      mockPrisma.message.delete.mockResolvedValue({});

      const result = await service.deleteMessage("msg-1", "user-1");
      expect(result).toEqual({ success: true });
      expect(mockEvents.emit).toHaveBeenCalledWith("message.deleted", {
        conversationId: "conv-1",
        messageId: "msg-1",
      });
    });

    it("should throw NotFound for missing message", async () => {
      mockPrisma.message.findUnique.mockResolvedValue(null);
      await expect(service.deleteMessage("bad-id", "user-1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe("getMessages", () => {
    it("should return paginated messages", async () => {
      mockPrisma.conversation_Participant.findUnique.mockResolvedValue({
        leftAt: null,
      });
      mockPrisma.message.findMany.mockResolvedValue([]);
      mockPrisma.message.count.mockResolvedValue(0);

      const result = await service.getMessages("conv-1", "user-1", {});
      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  describe("unread counts and read marking", () => {
    const baseParticipation = (lastReadAt: Date | null) => ({
      id: "p1",
      userId: "user-1",
      role: "ADMIN",
      joinedAt: new Date(),
      leftAt: null,
      lastReadAt,
      conversation: {
        id: "conv-1",
        name: null,
        isGroup: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        participants: [],
        messages: [],
      },
    });

    it("counts messages newer than lastReadAt excluding own", async () => {
      mockPrisma.conversation_Participant.findMany.mockResolvedValue([
        baseParticipation(new Date("2026-08-01T00:00:00Z")),
      ]);
      mockPrisma.conversation_Participant.count.mockResolvedValue(1);
      mockPrisma.message.count.mockResolvedValue(3);

      const result = await service.findUserConversations("user-1", {});

      expect(mockPrisma.message.count).toHaveBeenCalledWith({
        where: {
          conversationId: "conv-1",
          senderId: { not: "user-1" },
          createdAt: { gt: new Date("2026-08-01T00:00:00Z") },
        },
      });
      expect(result.data[0].unreadCount).toBe(3);
    });

    it("skips the createdAt filter when never read", async () => {
      mockPrisma.conversation_Participant.findMany.mockResolvedValue([
        baseParticipation(null),
      ]);
      mockPrisma.conversation_Participant.count.mockResolvedValue(1);
      mockPrisma.message.count.mockResolvedValue(5);

      const result = await service.findUserConversations("user-1", {});

      expect(mockPrisma.message.count).toHaveBeenCalledWith({
        where: { conversationId: "conv-1", senderId: { not: "user-1" } },
      });
      expect(result.data[0].unreadCount).toBe(5);
    });

    it("marks conversation read", async () => {
      mockPrisma.conversation_Participant.findUnique.mockResolvedValue({
        id: "p1",
        leftAt: null,
      });
      mockPrisma.conversation_Participant.update.mockResolvedValue({});

      const result = await service.markConversationRead("conv-1", "user-1");

      expect(mockPrisma.conversation_Participant.update).toHaveBeenCalledWith({
        where: {
          conversationId_userId: { conversationId: "conv-1", userId: "user-1" },
        },
        data: { lastReadAt: expect.any(Date) },
      });
      expect(result).toEqual({ success: true });
    });

    it("rejects read marking for non-participants", async () => {
      mockPrisma.conversation_Participant.findUnique.mockResolvedValue(null);
      await expect(
        service.markConversationRead("conv-1", "user-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("addParticipants", () => {
    const conversation = {
      id: "conv-1",
      name: "Crew",
      isGroup: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      participants: [],
      messages: [],
    };

    it("adds new members when acting admin", async () => {
      mockPrisma.conversation_Participant.findUnique
        .mockResolvedValueOnce({ role: "ADMIN", leftAt: null }) // assertAdmin
        .mockResolvedValueOnce(null); // user-3 not a member
      mockPrisma.conversation_Participant.create.mockResolvedValue({});
      mockPrisma.conversation.findUnique.mockResolvedValue(conversation);

      await service.addParticipants(
        "conv-1",
        { userIds: ["user-3"] },
        "user-1",
      );

      expect(mockPrisma.conversation_Participant.create).toHaveBeenCalledWith({
        data: { conversationId: "conv-1", userId: "user-3", role: "MEMBER" },
      });
      expect(mockEvents.emit).toHaveBeenCalledWith("participant.added", {
        conversationId: "conv-1",
        userId: "user-3",
      });
    });

    it("rejoins a soft-left member", async () => {
      mockPrisma.conversation_Participant.findUnique
        .mockResolvedValueOnce({ role: "ADMIN", leftAt: null })
        .mockResolvedValueOnce({
          id: "p9",
          userId: "user-3",
          leftAt: new Date(),
        });
      mockPrisma.conversation_Participant.update.mockResolvedValue({});
      mockPrisma.conversation.findUnique.mockResolvedValue(conversation);

      await service.addParticipants(
        "conv-1",
        { userIds: ["user-3"] },
        "user-1",
      );

      expect(mockPrisma.conversation_Participant.update).toHaveBeenCalledWith({
        where: { id: "p9" },
        data: { leftAt: null, joinedAt: expect.any(Date) },
      });
    });

    it("rejects non-admin actors", async () => {
      mockPrisma.conversation_Participant.findUnique.mockResolvedValue({
        role: "MEMBER",
        leftAt: null,
      });
      await expect(
        service.addParticipants("conv-1", { userIds: ["user-3"] }, "user-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe("removeParticipant", () => {
    it("lets an admin remove someone else (soft leave)", async () => {
      mockPrisma.conversation_Participant.findUnique
        .mockResolvedValueOnce({
          id: "p2",
          userId: "user-2",
          leftAt: null,
        }) // target
        .mockResolvedValueOnce({ role: "ADMIN", leftAt: null }); // assertAdmin
      mockPrisma.conversation_Participant.update.mockResolvedValue({});

      const result = await service.removeParticipant(
        "conv-1",
        "user-2",
        "user-1",
      );

      expect(mockPrisma.conversation_Participant.update).toHaveBeenCalledWith({
        where: { id: "p2" },
        data: { leftAt: expect.any(Date) },
      });
      expect(mockEvents.emit).toHaveBeenCalledWith("participant.left", {
        conversationId: "conv-1",
        userId: "user-2",
      });
      expect(result).toEqual({ success: true });
    });

    it("blocks sole-admin self-leave", async () => {
      mockPrisma.conversation_Participant.findUnique
        .mockResolvedValueOnce({
          id: "p1",
          userId: "user-1",
          leftAt: null,
        }) // target (self)
        .mockResolvedValueOnce({ role: "ADMIN", leftAt: null }) // participant lookup in guard
        .mockResolvedValueOnce(0); // other active admins
      mockPrisma.conversation_Participant.count.mockResolvedValue(0);

      await expect(
        service.removeParticipant("conv-1", "user-1", "user-1"),
      ).rejects.toThrow(
        "You are the only admin. Delete the conversation instead of leaving it.",
      );
    });

    it("allows self-leave when another admin exists", async () => {
      mockPrisma.conversation_Participant.findUnique
        .mockResolvedValueOnce({
          id: "p1",
          userId: "user-1",
          leftAt: null,
        })
        .mockResolvedValueOnce({ role: "ADMIN", leftAt: null });
      mockPrisma.conversation_Participant.count.mockResolvedValue(1);
      mockPrisma.conversation_Participant.update.mockResolvedValue({});

      await service.removeParticipant("conv-1", "user-1", "user-1");

      expect(mockPrisma.conversation_Participant.update).toHaveBeenCalled();
      expect(mockEvents.emit).toHaveBeenCalledWith("participant.left", {
        conversationId: "conv-1",
        userId: "user-1",
      });
    });
  });

  describe("deleteConversation", () => {
    it("deletes and emits when acting admin", async () => {
      mockPrisma.conversation_Participant.findUnique.mockResolvedValue({
        role: "ADMIN",
        leftAt: null,
      });
      mockPrisma.conversation.delete.mockResolvedValue({});

      const result = await service.deleteConversation("conv-1", "user-1");

      expect(mockPrisma.conversation.delete).toHaveBeenCalledWith({
        where: { id: "conv-1" },
      });
      expect(mockEvents.emit).toHaveBeenCalledWith("conversation.deleted", {
        conversationId: "conv-1",
      });
      expect(result).toEqual({ success: true });
    });

    it("rejects non-admin actors", async () => {
      mockPrisma.conversation_Participant.findUnique.mockResolvedValue({
        role: "MEMBER",
        leftAt: null,
      });
      await expect(
        service.deleteConversation("conv-1", "user-1"),
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
