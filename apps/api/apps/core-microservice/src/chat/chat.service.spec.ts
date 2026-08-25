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
    },
    conversation_Participant: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      count: jest.fn(),
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
    jest.clearAllMocks();

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
            user: { id: "user-1", userName: "alice", displayName: "Alice", avatarUrl: null },
          },
          {
            id: "p2",
            userId: "user-2",
            role: "MEMBER",
            joinedAt: new Date(),
            leftAt: null,
            user: { id: "user-2", userName: "bob", displayName: "Bob", avatarUrl: null },
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
        sender: { id: "user-1", userName: "alice", displayName: "Alice", avatarUrl: null },
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
      await expect(
        service.deleteMessage("bad-id", "user-1"),
      ).rejects.toThrow(NotFoundException);
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
});
