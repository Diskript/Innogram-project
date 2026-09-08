"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Search, Users, X } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui-kit/dialog";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui-kit/command";
import { api } from "@/lib/api-client";
import { createConversation, type ChatUser } from "@/lib/chat";

interface NewChatDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function NewChatDialog({ open, onOpenChange }: NewChatDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<ChatUser[]>([]);
  const [groupName, setGroupName] = useState("");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: results } = useQuery({
    queryKey: ["chat", "user-search", search],
    queryFn: () =>
      api.get<{ data: ChatUser[] }>("/users/search", { q: search }),
    enabled: open && search.trim().length > 0,
  });

  const isGroup = selected.length >= 2;

  const toggle = (u: ChatUser) => {
    setSelected((old) =>
      old.some((s) => s.id === u.id)
        ? old.filter((s) => s.id !== u.id)
        : [...old, u],
    );
  };

  const create = async () => {
    setError(null);
    if (selected.length === 0) return;
    if (isGroup && groupName.trim().length === 0) {
      setError("Give the group a name.");
      return;
    }
    setCreating(true);
    try {
      const conversation = await createConversation({
        participantIds: selected.map((s) => s.id),
        ...(isGroup ? { isGroup: true, name: groupName.trim() } : {}),
      });
      await queryClient.invalidateQueries({
        queryKey: ["chat", "conversations"],
      });
      onOpenChange(false);
      setSelected([]);
      setGroupName("");
      setSearch("");
      router.push(`/chat/${conversation.id}`);
    } catch {
      setError("Could not create the conversation. Try again.");
    } finally {
      setCreating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-[var(--chat-border-hover)] bg-[var(--chat-panel)] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">New chat</DialogTitle>
        </DialogHeader>

        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selected.map((s) => (
              <span
                key={s.id}
                className="flex items-center gap-1.5 rounded-full border border-[var(--chat-border-hover)] bg-[#2a2350] px-2.5 py-1 text-[11.5px]"
              >
                {s.displayName}
                <button
                  onClick={() => toggle(s)}
                  className="text-[var(--chat-text-secondary)] hover:text-white"
                  aria-label={`Remove ${s.displayName}`}
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {isGroup && (
          <div className="flex items-center gap-2 text-[11px] text-[var(--chat-violet-light)]">
            <Users className="h-3.5 w-3.5" />
            <span>{selected.length} selected — this will be a group.</span>
          </div>
        )}

        {isGroup && (
          <input
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            placeholder="Group name…"
            className="w-full rounded-[11px] border border-[var(--chat-border)] bg-[var(--chat-bg)] px-3 py-2 text-[13px] outline-none placeholder:text-[var(--chat-text-tertiary)] focus:border-[var(--chat-amber)]"
          />
        )}

        <Command shouldFilter={false}>
          <div className="flex items-center gap-2 rounded-[11px] border border-[var(--chat-border)] bg-[var(--chat-bg)] px-3">
            <Search className="h-4 w-4 text-[var(--chat-text-tertiary)]" />
            <CommandInput
              value={search}
              onValueChange={setSearch}
              placeholder="Search people…"
              className="h-10 border-0 bg-transparent focus:ring-0"
            />
          </div>
          <CommandList className="mt-2 max-h-60">
            <CommandEmpty>No people found.</CommandEmpty>
            <CommandGroup>
              {(results?.data ?? []).map((u) => {
                const isSelected = selected.some((s) => s.id === u.id);
                return (
                  <CommandItem
                    key={u.id}
                    value={u.id}
                    onSelect={() => toggle(u)}
                    className={`gap-2.5 ${isSelected ? "bg-[#2a2350]" : ""}`}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--chat-amber-light)] to-[#d97706] text-[11px] font-semibold text-[var(--chat-amber-ink)]">
                      {u.displayName.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate text-[13px] font-semibold">
                        {u.displayName}
                      </span>
                      <span className="block truncate text-[11px] text-[var(--chat-text-tertiary)]">
                        @{u.userName}
                      </span>
                    </span>
                    {isSelected && (
                      <Check className="ml-auto h-4 w-4 text-[var(--chat-amber)]" />
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
        </Command>

        {error && <p className="text-xs text-[#ff7a6e]">{error}</p>}

        <button
          onClick={() => void create()}
          disabled={selected.length === 0 || creating}
          className="glow-soft mt-1 flex w-full items-center justify-center gap-2 rounded-[10px] bg-gradient-to-br from-[var(--chat-amber-light)] to-[var(--chat-amber-deep)] py-2 text-[13px] font-bold text-[var(--chat-amber-ink)] disabled:opacity-40"
        >
          {creating && <Loader2 className="h-4 w-4 animate-spin" />}
          {isGroup ? "Create group chat" : "Start chat"}
        </button>
      </DialogContent>
    </Dialog>
  );
}
