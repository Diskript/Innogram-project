import { Test, TestingModule } from "@nestjs/testing";
import { WsGateway } from "./ws.gateway";
import { WsAuthService } from "./ws.auth";
import { UnauthorizedException } from "@nestjs/common";

describe("WsGateway", () => {
  let gateway: WsGateway;
  let wsAuthService: WsAuthService;

  const mockSocket = {
    id: "socket-1",
    handshake: { auth: {} },
    data: {},
    join: jest.fn(),
    disconnect: jest.fn(),
  };

  const mockServer = {
    to: jest.fn().mockReturnThis(),
    except: jest.fn().mockReturnThis(),
    emit: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WsGateway,
        {
          provide: WsAuthService,
          useValue: { verify: jest.fn() },
        },
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
});
