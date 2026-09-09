"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Search, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui-kit/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui-kit/alert-dialog";
import { ApiError, api } from "@/lib/api-client";
import {
  addParticipants,
  deleteConversation,
  removeParticipant,
  type ChatConversation,
  type ChatUser,
} from "@/lib/chat";
import { useAuth } from "@/contexts/auth-context";
import { conversationTitle } from "@/components/chat/conversation-list";

function serverMessage(err: unknown): string {
  if (err instanceof ApiError) {
    const message = (err.body as { message?: string } | null)?.message;
    if (message) {
      return message;
    }
  }
  return err instanceof Error ? err.message : "";
}

interface ParticipantsPanelProps {
  conversation: ChatConversation;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ParticipantsPanel({
  conversation,
  open,
  onOpenChange,
}: ParticipantsPanelProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [search, setSearch] = useState("");
  const [confirmLeave, setConfirmLeave] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState<ChatUser | null>(null);
  const [error, setError] = useState<string | null>(null);

  const activeMembers = conversation.participants.filter((p) => !p.leftAt);
  const me = activeMembers.find((p) => p.userId === user?.userId);
  const iAmAdmin = me?.role === "ADMIN";
  const soleAdmin =
    iAmAdmin && activeMembers.filter((p) => p.role === "ADMIN").length === 1;

  const { data: searchResults } = useQuery({
    queryKey: ["chat", "user-search", search],
    queryFn: () =>
      api.get<{ data: ChatUser[] }>("/users/search", { q: search }),
    enabled: open && iAmAdmin && search.trim().length > 0,
  });

  const refresh = () => {
    void queryClient.invalidateQueries({
      queryKey: ["chat", "conversation", conversation.id],
    });
    void queryClient.invalidateQueries({
      queryKey: ["chat", "conversations"],
    });
  };

  const add = async (u: ChatUser) => {
    setError(null);
    try {
      await addParticipants(conversation.id, [u.id]);
      setSearch("");
      refresh();
    } catch {
      setError("Could not add this person.");
    }
  };

  const remove = async (userId: string) => {
    setError(null);
    try {
      await removeParticipant(conversation.id, userId);
      setConfirmRemove(null);
      refresh();
    } catch (err) {
      setError(
        serverMessage(err).includes("only admin")
          ? "You're the only admin. Promote another member first, or delete this conversation."
          : "Could not remove this member.",
      );
    }
  };

  const leave = async () => {
    try {
      await removeParticipant(conversation.id, user!.userId);
      setConfirmLeave(false);
      onOpenChange(false);
      router.replace("/chat");
      refresh();
    } catch (err) {
      setConfirmLeave(false);
      setError(
        serverMessage(err).includes("only admin")
          ? "You're the only admin. Promote another member first, or delete this conversation."
          : "Could not leave this conversation.",
      );
    }
  };

  const destroy = async () => {
    try {
      await deleteConversation(conversation.id);
      setConfirmDelete(false);
      onOpenChange(false);
      router.replace("/chat");
      refresh();
    } catch {
      setConfirmDelete(false);
      setError("Could not delete this conversation.");
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="border-[var(--chat-border-hover)] bg-[var(--chat-panel)] sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              {conversationTitle(conversation, user!.userId)} —{" "}
              {activeMembers.length} member
              {activeMembers.length === 1 ? "" : "s"}
            </DialogTitle>
          </DialogHeader>

          {iAmAdmin && (
            <div className="flex items-center gap-2 rounded-[11px] border border-dashed border-[var(--chat-border-hover)] bg-[var(--chat-bg)] px-3 py-2.5">
              <Search className="h-4 w-4 text-[var(--chat-text-tertiary)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Add people…"
                className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--chat-text-tertiary)]"
              />
            </div>
          )}

          {search.trim().length > 0 && iAmAdmin && (
            <div className="max-h-40 overflow-y-auto">
              {(searchResults?.data ?? [])
                .filter((u) => !activeMembers.some((m) => m.userId === u.id))
                .map((u) => (
                  <button
                    key={u.id}
                    onClick={() => void add(u)}
                    className="flex w-full items-center gap-2.5 rounded-[10px] px-2 py-2 text-left hover:bg-[var(--accent)]"
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--chat-amber-light)] to-[#d97706] text-[11px] font-semibold text-[var(--chat-amber-ink)]">
                      {u.displayName.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="text-[13px] font-semibold">
                      {u.displayName}
                    </span>
                    <Plus className="ml-auto h-4 w-4 text-[var(--chat-amber)]" />
                  </button>
                ))}
            </div>
          )}

          {error && <p className="text-xs text-[#ff7a6e]">{error}</p>}

          <div className="max-h-64 overflow-y-auto">
            {activeMembers.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-2.5 rounded-[10px] px-2 py-2"
              >
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[var(--chat-amber-light)] to-[#d97706] text-[11px] font-semibold text-[var(--chat-amber-ink)]">
                  {p.user.displayName.slice(0, 2).toUpperCase()}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13px] font-semibold">
                    {p.user.displayName}
                    {p.userId === user?.userId ? " (you)" : ""}
                  </span>
                  <span className="block truncate text-[11px] text-[var(--chat-text-tertiary)]">
                    @{p.user.userName}
                  </span>
                </span>
                {p.role === "ADMIN" ? (
                  <span className="ml-auto rounded-md border border-[rgba(139,124,246,0.35)] bg-[rgba(139,124,246,0.14)] px-2 py-0.5 text-[9.5px] font-bold tracking-wide text-[var(--chat-violet-light)]">
                    ADMIN
                  </span>
                ) : iAmAdmin ? (
                  <button
                    onClick={() =>
                      setConfirmRemove({
                        id: p.userId,
                        userName: p.user.userName,
                        displayName: p.user.displayName,
                        avatarUrl: p.user.avatarUrl,
                      })
                    }
                    className="ml-auto text-xs text-[#ff7a6e]"
                  >
                    ✕ remove
                  </button>
                ) : null}
              </div>
            ))}
          </div>

          {soleAdmin ? (
            <div className="flex items-start gap-2.5 rounded-[11px] border border-[rgba(240,166,60,0.3)] bg-[rgba(240,166,60,0.08)] px-3 py-2.5 text-xs text-[#f0c98a]">
              <span>👑</span>
              <span>
                You&apos;re the only admin. Promote another member to admin
                first, or delete this conversation to leave it.
              </span>
            </div>
          ) : null}

          {soleAdmin ? (
            <button
              onClick={() => setConfirmDelete(true)}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-[rgba(232,80,60,0.4)] bg-[rgba(232,80,60,0.07)] py-2.5 text-[12.5px] font-semibold text-[#ff7a6e]"
            >
              <Trash2 className="h-3.5 w-3.5" /> Delete conversation
            </button>
          ) : (
            <button
              onClick={() => setConfirmLeave(true)}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] border border-[rgba(232,80,60,0.4)] bg-[rgba(232,80,60,0.07)] py-2.5 text-[12.5px] font-semibold text-[#ff7a6e]"
            >
              Leave conversation
            </button>
          )}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={confirmRemove !== null}
        onOpenChange={(o) => !o && setConfirmRemove(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Remove {confirmRemove?.displayName}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              They lose access to this conversation. They can be added back
              later.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--chat-danger)] text-white hover:bg-[#ff8a7a]"
              onClick={() => confirmRemove && void remove(confirmRemove.id)}
            >
              Remove
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmLeave} onOpenChange={setConfirmLeave}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Leave this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              You&apos;ll stop receiving new messages. An admin can add you
              back.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-[var(--chat-danger)] text-white hover:bg-[#ff8a7a]"
              onClick={() => void leave()}
            >
              Leave conversation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{conversationTitle(conversation, user!.userId)}
              &quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              The conversation, its messages and all members are removed for
              everyone. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-gradient-to-br from-[#ff8a7a] to-[var(--chat-danger)] text-[#2a0b06]"
              onClick={() => void destroy()}
            >
              Delete conversation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
