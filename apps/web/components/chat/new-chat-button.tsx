"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { NewChatDialog } from "@/components/chat/new-chat-dialog";

export function NewChatButton() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="New chat"
        className="glow-soft flex h-7 w-7 items-center justify-center rounded-[9px] bg-gradient-to-br from-[var(--chat-amber-light)] to-[var(--chat-amber-deep)] font-bold text-[var(--chat-amber-ink)]"
      >
        <Plus className="h-4 w-4" />
      </button>
      <NewChatDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
