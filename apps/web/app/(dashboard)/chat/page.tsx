"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="chat-aurora flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--chat-panel)]">
        <MessageCircle className="h-6 w-6 text-[var(--chat-amber)]" />
      </div>
      <div>
        <h2 className="font-display text-lg font-semibold">
          Select a conversation
        </h2>
        <p className="mt-1 text-sm text-[var(--chat-text-secondary)]">
          Pick a chat on the left, or start a new one.
        </p>
      </div>
      <Link
        href="/chat"
        className="glow-soft rounded-lg bg-[var(--chat-amber)] px-4 py-2 text-sm font-semibold text-[var(--chat-amber-ink)]"
      >
        New chat
      </Link>
    </div>
  );
}
