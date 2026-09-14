"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  useInfiniteQuery,
  useQueryClient,
  type InfiniteData,
} from "@tanstack/react-query";
import { MoreHorizontal, Users } from "lucide-react";
import { useMemo, useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui-kit/dropdown-menu";
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
import {
  deleteConversation,
  getConversations,
  markConversationRead,
  removeParticipant,
  type ChatConversation,
} from "@/lib/chat";
import { useAuth } from "@/contexts/auth-context";
import { NewChatButton } from "@/components/chat/new-chat-button";

export function conversationTitle(
  conversation: ChatConversation,
  myUserId: string,
): string {
  if (conversation.isGroup) {
    return conversation.name || "Group chat";
  }
  const other = conversation.participants.find((p) => p.userId !== myUserId);
  return other?.user.displayName ?? "Direct chat";
}

function isActiveAdminOnly(conversation: ChatConversation, myUserId: string) {
  const me = conversation.participants.find((p) => p.userId === myUserId);
  if (!me || me.role !== "ADMIN" || me.leftAt) return false;
  const otherAdmins = conversation.participants.filter(
    (p) => p.userId !== myUserId && p.role === "ADMIN" && !p.leftAt,
  );
  return otherAdmins.length === 0;
}

export function ConversationList() {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [pendingDelete, setPendingDelete] = useState<ChatConversation | null>(
    null,
  );

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["chat", "conversations"],
      initialPageParam: undefined as string | undefined,
      queryFn: ({ pageParam }) =>
        getConversations(
          pageParam ? { cursor: pageParam, take: 50 } : { take: 50 },
        ),
      getNextPageParam: (lastPage) => lastPage.nextCursor ?? undefined,
    });

  const conversations = useMemo(
    () => data?.pages.flatMap((page) => page.data) ?? [],
    [data],
  );

  const handleMarkRead = async (id: string) => {
    await markConversationRead(id);
    queryClient.setQueryData<
      InfiniteData<{ data: ChatConversation[]; nextCursor: string | null }>
    >(["chat", "conversations"], (old) =>
      old
        ? {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((c) =>
                c.id === id ? { ...c, unreadCount: 0 } : c,
              ),
            })),
          }
        : old,
    );
  };

  const handleLeave = async (conversation: ChatConversation) => {
    await removeParticipant(conversation.id, user!.userId);
    if (pathname === `/chat/${conversation.id}`) {
      router.push("/chat");
    }
    void queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
  };

  const handleDelete = async (conversation: ChatConversation) => {
    await deleteConversation(conversation.id);
    setPendingDelete(null);
    if (pathname === `/chat/${conversation.id}`) {
      router.push("/chat");
    }
    void queryClient.invalidateQueries({ queryKey: ["chat", "conversations"] });
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-4 pb-2 pt-4">
        <h1 className="font-display text-base font-semibold tracking-tight">
          Chats
        </h1>
        <NewChatButton />
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            Loading…
          </div>
        ) : conversations.length === 0 ? (
          <div className="px-4 py-8 text-center text-sm text-muted-foreground">
            No conversations yet. Start one with New chat.
          </div>
        ) : (
          <>
            {conversations.map((conversation) => {
              const active = pathname === `/chat/${conversation.id}`;
              const title = conversationTitle(conversation, user!.userId);
              const initials = title
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();
              const preview = conversation.lastMessage
                ? `${
                    conversation.lastMessage.senderId === user?.userId
                      ? "You: "
                      : ""
                  }${conversation.lastMessage.content}`
                : "No messages yet";

              return (
                <button
                  key={conversation.id}
                  onClick={() => router.push(`/chat/${conversation.id}`)}
                  className={`flex w-full items-center gap-3 border-b border-border px-3.5 py-2.5 text-left transition-colors hover:bg-accent ${
                    active ? "bg-accent" : ""
                  }`}
                >
                  <div className="relative flex-shrink-0">
                    {conversation.isGroup ? (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground">
                        <Users className="size-4" />
                      </div>
                    ) : (
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
                        {initials}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-semibold">
                      {title}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {preview}
                    </div>
                  </div>
                  {(conversation.unreadCount || 0) > 0 && (
                    <span className="font-meta flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium tabular-nums text-primary-foreground">
                      {conversation.unreadCount > 99
                        ? "99+"
                        : conversation.unreadCount}
                    </span>
                  )}
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <span
                        role="button"
                        tabIndex={0}
                        onClick={(e) => e.stopPropagation()}
                        className="flex size-9 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground max-lg:size-11"
                      >
                        <MoreHorizontal className="size-4" />
                      </span>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-44">
                      <DropdownMenuItem
                        onClick={() => void handleMarkRead(conversation.id)}
                      >
                        Mark as read
                      </DropdownMenuItem>
                      {isActiveAdminOnly(conversation, user!.userId) ? (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => setPendingDelete(conversation)}
                        >
                          Delete conversation
                        </DropdownMenuItem>
                      ) : (
                        <DropdownMenuItem
                          className="text-destructive focus:text-destructive"
                          onClick={() => void handleLeave(conversation)}
                        >
                          Leave conversation
                        </DropdownMenuItem>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </button>
              );
            })}
            {hasNextPage && (
              <button
                disabled={isFetchingNextPage}
                onClick={() => void fetchNextPage()}
                className="flex max-lg:min-h-11 w-full items-center justify-center border-b border-border px-3.5 py-2.5 text-center text-xs text-muted-foreground transition-colors hover:bg-accent"
              >
                Load more
              </button>
            )}
          </>
        )}
      </div>

      <AlertDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;
              {pendingDelete
                ? conversationTitle(pendingDelete, user!.userId)
                : ""}
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
              onClick={() => pendingDelete && void handleDelete(pendingDelete)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete conversation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
