"use client";

export function ConversationList() {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h1 className="font-display text-base font-bold">Chats</h1>
      </div>
      <div className="px-4 py-8 text-center text-sm text-[var(--chat-text-tertiary)]">
        Loading…
      </div>
    </div>
  );
}
