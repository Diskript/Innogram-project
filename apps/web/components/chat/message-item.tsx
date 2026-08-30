"use client";

import type { ChatMessage } from "@/lib/chat";

export function MessageItem({
  message,
}: {
  message: ChatMessage;
  conversationId: string;
  compact: boolean;
}) {
  return <div className="py-0.5 text-sm">{message.content}</div>;
}
