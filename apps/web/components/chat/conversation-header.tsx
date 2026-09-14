"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { getConversation } from "@/lib/chat";
import { useAuth } from "@/contexts/auth-context";
import { useChat } from "@/contexts/chat-context";
import { conversationTitle } from "@/components/chat/conversation-list";
import { ParticipantsPanel } from "@/components/chat/participants-panel";

export function ConversationHeader({
  conversationId,
}: {
  conversationId: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const { typingBy, isOnline, setActiveConversationId } = useChat();
  const [panelOpen, setPanelOpen] = useState(false);

  const {
    data: conversation,
    isError,
    error,
  } = useQuery({
    queryKey: ["chat", "conversation", conversationId],
    queryFn: () => getConversation(conversationId),
    retry: (failureCount, err) =>
      !(
        err instanceof ApiError &&
        (err.status === 403 || err.status === 404)
      ) && failureCount < 2,
  });

  const isMember =
    conversation?.participants.some(
      (p) => p.userId === user?.userId && !p.leftAt,
    ) ?? true;

  useEffect(() => {
    if (conversation && user && !isMember) {
      setActiveConversationId(null);
      router.replace("/chat");
    }
  }, [conversation, user, isMember, router, setActiveConversationId]);

  if (isError) {
    const notFound =
      error instanceof ApiError &&
      (error.status === 403 || error.status === 404);
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <h2 className="text-base font-semibold tracking-tight">
          {notFound ? "Conversation unavailable" : "Something went wrong"}
        </h2>
        <p className="max-w-xs text-sm text-muted-foreground">
          {notFound
            ? "You don't have access to this conversation, or it no longer exists."
            : "The conversation could not be loaded."}
        </p>
        <Link
          href="/chat"
          className="flex max-lg:min-h-11 items-center rounded-lg border border-border px-4 py-2 text-sm font-semibold transition-colors hover:border-ring/40"
        >
          Back to chats
        </Link>
      </div>
    );
  }

  if (!conversation) {
    return <div className="border-b border-border px-5 py-3" />;
  }

  const title = conversationTitle(conversation, user!.userId);
  const other =
    conversation.participants.find((p) => p.userId !== user?.userId) ??
    conversation.participants[0];
  const online = other ? isOnline(other.userId) : false;
  const typing = typingBy(conversationId);
  const typingNames = typing
    .map(
      (id) =>
        conversation.participants.find((p) => p.userId === id)?.user
          .displayName,
    )
    .filter(Boolean) as string[];

  const typingLabel =
    typingNames.length === 0
      ? conversation.isGroup
        ? `${conversation.participants.filter((p) => !p.leftAt).length} members`
        : online
          ? "online"
          : "offline"
      : typingNames.length === 1
        ? `${typingNames[0]} is typing…`
        : `${typingNames[0]} and ${typingNames.length - 1} other${
            typingNames.length > 2 ? "s" : ""
          } are typing…`;

  const showLamp = !conversation.isGroup;

  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative flex-shrink-0">
          {conversation.isGroup ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground">
              <Users className="size-4" />
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/15 text-xs font-semibold text-primary">
              {title
                .split(" ")
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
                .toUpperCase()}
            </div>
          )}
          {showLamp && (
            <span
              className={`absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-card ${
                online ? "bg-primary" : "bg-muted-foreground/40"
              }`}
            />
          )}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold">{title}</div>
          <div
            className={`truncate text-[11px] ${
              typing.length > 0
                ? "text-primary"
                : showLamp && online
                  ? "text-muted-foreground"
                  : "text-muted-foreground"
            }`}
          >
            {typingLabel}
          </div>
        </div>
      </div>

      <button
        onClick={() => setPanelOpen(true)}
        className="flex max-lg:min-h-11 items-center gap-1.5 rounded-lg border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
      >
        <Users className="size-3.5" />
        Members
      </button>

      <ParticipantsPanel
        conversation={conversation}
        open={panelOpen}
        onOpenChange={setPanelOpen}
      />
    </div>
  );
}
