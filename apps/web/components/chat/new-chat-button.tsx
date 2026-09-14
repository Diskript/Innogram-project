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
        className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors hover:bg-primary/90 max-lg:size-11"
      >
        <Plus className="size-4" />
      </button>
      <NewChatDialog open={open} onOpenChange={setOpen} />
    </>
  );
}
