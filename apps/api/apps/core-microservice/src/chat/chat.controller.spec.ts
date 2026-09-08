import { Test, TestingModule } from "@nestjs/testing";
import { ChatController } from "./chat.controller";
import { ChatService } from "./chat.service";

describe("ChatController", () => {
  let controller: ChatController;

  const mockChatService = {
    createConversation: jest.fn(),
    findUserConversations: jest.fn(),
    getConversation: jest.fn(),
    sendMessage: jest.fn(),
    getMessages: jest.fn(),
    updateMessage: jest.fn(),
    deleteMessage: jest.fn(),
    addParticipants: jest.fn(),
    removeParticipant: jest.fn(),
    deleteConversation: jest.fn(),
    markConversationRead: jest.fn(),
  };

  const mockUser = { userId: "user-1", email: "alice@test.com" };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ChatController],
      providers: [{ provide: ChatService, useValue: mockChatService }],
    }).compile();

    controller = module.get<ChatController>(ChatController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });

  describe("createConversation", () => {
    it("should delegate to service", async () => {
      const dto = { participantIds: ["user-2"], name: "Test" };
      mockChatService.createConversation.mockResolvedValue({
        id: "conv-1",
        name: "Test",
      });

      const result = await controller.createConversation(dto, mockUser);
      expect(result).toEqual({ id: "conv-1", name: "Test" });
      expect(mockChatService.createConversation).toHaveBeenCalledWith(
        dto,
        "user-1",
      );
    });
  });

  describe("findConversations", () => {
    it("should delegate to service", async () => {
      const query = { skip: 0, take: 20 };
      mockChatService.findUserConversations.mockResolvedValue({
        data: [],
        total: 0,
      });

      const result = await controller.findConversations(query, mockUser);
      expect(result).toEqual({ data: [], total: 0 });
      expect(mockChatService.findUserConversations).toHaveBeenCalledWith(
        "user-1",
        query,
      );
    });
  });

  describe("getConversation", () => {
    it("should delegate to service", async () => {
      mockChatService.getConversation.mockResolvedValue({
        id: "conv-1",
        name: "Test",
      });

      const result = await controller.getConversation("conv-1", mockUser);
      expect(result).toEqual({ id: "conv-1", name: "Test" });
      expect(mockChatService.getConversation).toHaveBeenCalledWith(
        "conv-1",
        "user-1",
      );
    });
  });

  describe("sendMessage", () => {
    it("should delegate to service", async () => {
      const dto = { content: "hello" };
      mockChatService.sendMessage.mockResolvedValue({
        id: "msg-1",
        content: "hello",
      });

      const result = await controller.sendMessage("conv-1", dto, mockUser);
      expect(result).toEqual({ id: "msg-1", content: "hello" });
      expect(mockChatService.sendMessage).toHaveBeenCalledWith(
        "conv-1",
        dto,
        "user-1",
      );
    });
  });

  describe("getMessages", () => {
    it("should delegate to service", async () => {
      const query = { skip: 0, take: 50 };
      mockChatService.getMessages.mockResolvedValue({ data: [], total: 0 });

      const result = await controller.getMessages("conv-1", query, mockUser);
      expect(result).toEqual({ data: [], total: 0 });
      expect(mockChatService.getMessages).toHaveBeenCalledWith(
        "conv-1",
        "user-1",
        query,
      );
    });
  });

  describe("updateMessage", () => {
    it("should delegate to service", async () => {
      const dto = { content: "edited" };
      mockChatService.updateMessage.mockResolvedValue({
        id: "msg-1",
        content: "edited",
      });

      const result = await controller.updateMessage("msg-1", dto, mockUser);
      expect(result).toEqual({ id: "msg-1", content: "edited" });
      expect(mockChatService.updateMessage).toHaveBeenCalledWith(
        "msg-1",
        dto,
        "user-1",
      );
    });
  });

  describe("deleteMessage", () => {
    it("should delegate to service", async () => {
      mockChatService.deleteMessage.mockResolvedValue({ success: true });

      const result = await controller.deleteMessage("msg-1", mockUser);
      expect(result).toEqual({ success: true });
      expect(mockChatService.deleteMessage).toHaveBeenCalledWith(
        "msg-1",
        "user-1",
      );
    });
  });

  describe("addParticipants", () => {
    it("POST /chat/conversations/:id/participants calls service", async () => {
      mockChatService.addParticipants.mockResolvedValue({ id: "conv-1" });
      const dto = { userIds: ["user-2"] };

      const result = await controller.addParticipants("conv-1", dto, mockUser);
      expect(result).toEqual({ id: "conv-1" });
      expect(mockChatService.addParticipants).toHaveBeenCalledWith(
        "conv-1",
        { userIds: ["user-2"] },
        "user-1",
      );
    });
  });

  describe("removeParticipant", () => {
    it("DELETE /chat/conversations/:id/participants/:userId calls service", async () => {
      mockChatService.removeParticipant.mockResolvedValue({ success: true });

      const result = await controller.removeParticipant(
        "conv-1",
        "user-2",
        mockUser,
      );
      expect(result).toEqual({ success: true });
      expect(mockChatService.removeParticipant).toHaveBeenCalledWith(
        "conv-1",
        "user-2",
        "user-1",
      );
    });
  });

  describe("deleteConversation", () => {
    it("DELETE /chat/conversations/:id calls service", async () => {
      mockChatService.deleteConversation.mockResolvedValue({ success: true });

      const result = await controller.deleteConversation("conv-1", mockUser);
      expect(result).toEqual({ success: true });
      expect(mockChatService.deleteConversation).toHaveBeenCalledWith(
        "conv-1",
        "user-1",
      );
    });
  });

  describe("markRead", () => {
    it("POST /chat/conversations/:id/read calls service", async () => {
      mockChatService.markConversationRead.mockResolvedValue({
        success: true,
      });

      const result = await controller.markRead("conv-1", mockUser);
      expect(result).toEqual({ success: true });
      expect(mockChatService.markConversationRead).toHaveBeenCalledWith(
        "conv-1",
        "user-1",
      );
    });
  });
});
