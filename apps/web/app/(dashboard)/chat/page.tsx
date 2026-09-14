"use client";

import Link from "next/link";
import { MessageCircle } from "lucide-react";

export default function ChatPage() {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex size-14 items-center justify-center rounded-xl bg-secondary">
        <MessageCircle className="size-6 text-primary" />
      </div>
      <div>
        <h2 className="text-lg font-semibold tracking-tight">
          Select a conversation
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Pick a chat on the left, or start a new one.
        </p>
      </div>
      <Link
        href="/chat"
        className="flex h-11 items-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
      >
        New chat
      </Link>
    </div>
  );
}
