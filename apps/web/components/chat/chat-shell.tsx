"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ConversationList } from "@/components/chat/conversation-list";

export function ChatShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isThread = /^\/chat\/.+/.test(pathname);

  return (
    <div className="flex h-[calc(100vh-7rem)] overflow-hidden rounded-xl border border-[var(--chat-border)]">
      <div
        className={`flex-col border-r border-[var(--chat-border)] bg-[var(--chat-list)] lg:flex lg:w-80 lg:flex-shrink-0 ${
          isThread ? "hidden" : "flex w-full"
        }`}
      >
        <ConversationList />
      </div>
      <div className={`min-w-0 flex-1 ${isThread ? "flex" : "hidden lg:flex"}`}>
        {children}
      </div>
    </div>
  );
}
