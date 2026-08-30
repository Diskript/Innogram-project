"use client";

export function MessageComposer({
  conversationId,
}: {
  conversationId: string;
}) {
  void conversationId;
  return <div className="h-16 border-t border-[var(--chat-border)]" />;
}
