import { Injectable } from "@nestjs/common";

interface TypingState {
  timeout: ReturnType<typeof setTimeout>;
  lastBroadcast: number;
}

@Injectable()
export class TypingService {
  private state = new Map<string, TypingState>();

  private key(userId: string, conversationId: string): string {
    return `${userId}:${conversationId}`;
  }

  startTyping(
    userId: string,
    conversationId: string,
    onTimeout: () => void,
  ): "broadcast" | "throttled" {
    const k = this.key(userId, conversationId);
    const existing = this.state.get(k);

    if (existing) {
      clearTimeout(existing.timeout);
    }

    const timeout = setTimeout(() => {
      this.state.delete(k);
      onTimeout();
    }, 3000);

    const now = Date.now();
    const last = existing?.lastBroadcast ?? 0;

    this.state.set(k, { timeout, lastBroadcast: existing?.lastBroadcast ?? 0 });

    if (now - last >= 3000) {
      this.state.get(k)!.lastBroadcast = now;
      return "broadcast";
    }

    return "throttled";
  }

  stopTyping(userId: string, conversationId: string): boolean {
    const k = this.key(userId, conversationId);
    const existing = this.state.get(k);
    if (!existing) {
      return false;
    }
    clearTimeout(existing.timeout);
    this.state.delete(k);
    return true;
  }

  onMessageSent(userId: string, conversationId: string): boolean {
    return this.stopTyping(userId, conversationId);
  }
}
