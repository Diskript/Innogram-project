import { Test, TestingModule } from "@nestjs/testing";
import { TypingService } from "./typing.service";

describe("TypingService", () => {
  let service: TypingService;

  beforeEach(async () => {
    jest.useFakeTimers();
    const module: TestingModule = await Test.createTestingModule({
      providers: [TypingService],
    }).compile();
    module.useLogger(false);
    service = module.get<TypingService>(TypingService);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("startTyping", () => {
    it("should return broadcast on first call", () => {
      const result = service.startTyping("user-1", "conv-1", jest.fn());
      expect(result).toBe("broadcast");
    });

    it("should return throttled on second call within 3s", () => {
      service.startTyping("user-1", "conv-1", jest.fn());
      const result = service.startTyping("user-1", "conv-1", jest.fn());
      expect(result).toBe("throttled");
    });

    it("should return broadcast after 3s passes", () => {
      service.startTyping("user-1", "conv-1", jest.fn());
      jest.advanceTimersByTime(3001);
      const result = service.startTyping("user-1", "conv-1", jest.fn());
      expect(result).toBe("broadcast");
    });

    it("should call onTimeout after 3s of inactivity", () => {
      const onTimeout = jest.fn();
      service.startTyping("user-1", "conv-1", onTimeout);
      expect(onTimeout).not.toHaveBeenCalled();
      jest.advanceTimersByTime(3000);
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });

    it("should reset timeout on second call within window", () => {
      const onTimeout = jest.fn();
      service.startTyping("user-1", "conv-1", onTimeout);
      jest.advanceTimersByTime(2000);
      service.startTyping("user-1", "conv-1", onTimeout);
      jest.advanceTimersByTime(2000);
      expect(onTimeout).not.toHaveBeenCalled();
      jest.advanceTimersByTime(1000);
      expect(onTimeout).toHaveBeenCalledTimes(1);
    });
  });

  describe("stopTyping", () => {
    it("should return true and stop timeout when active", () => {
      const onTimeout = jest.fn();
      service.startTyping("user-1", "conv-1", onTimeout);
      const result = service.stopTyping("user-1", "conv-1");
      expect(result).toBe(true);
      jest.advanceTimersByTime(5000);
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it("should return false when no active state", () => {
      const result = service.stopTyping("user-1", "conv-1");
      expect(result).toBe(false);
    });
  });

  describe("onMessageSent", () => {
    it("should return true and stop timeout when active", () => {
      const onTimeout = jest.fn();
      service.startTyping("user-1", "conv-1", onTimeout);
      const result = service.onMessageSent("user-1", "conv-1");
      expect(result).toBe(true);
      jest.advanceTimersByTime(5000);
      expect(onTimeout).not.toHaveBeenCalled();
    });

    it("should return false when no active state", () => {
      const result = service.onMessageSent("user-1", "conv-1");
      expect(result).toBe(false);
    });
  });
});
