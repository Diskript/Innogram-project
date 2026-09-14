"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { ConversationList } from "@/components/chat/conversation-list";

export function ChatShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isThread = /^\/chat\/.+/.test(pathname);

  return (
    <div className="flex h-[calc(100dvh-3.5rem-3.5rem-env(safe-area-inset-bottom))] overflow-hidden rounded-xl border border-border bg-card lg:h-[calc(100dvh-6rem)]">
      <div
        className={`flex-col border-r border-border bg-background lg:flex lg:w-80 lg:shrink-0 ${
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
