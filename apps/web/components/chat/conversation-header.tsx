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
    if (conversation && !isMember) {
      setActiveConversationId(null);
      router.replace("/chat");
    }
  }, [conversation, isMember, router, setActiveConversationId]);

  if (isError) {
    const notFound =
      error instanceof ApiError &&
      (error.status === 403 || error.status === 404);
    return (
      <div className="chat-aurora flex flex-1 flex-col items-center justify-center gap-3 text-center">
        <h2 className="font-display text-base font-semibold">
          {notFound ? "Conversation unavailable" : "Something went wrong"}
        </h2>
        <p className="max-w-xs text-sm text-[var(--chat-text-secondary)]">
          {notFound
            ? "You don't have access to this conversation, or it no longer exists."
            : "The conversation could not be loaded."}
        </p>
        <Link
          href="/chat"
          className="rounded-lg border border-[var(--chat-border)] px-4 py-2 text-sm font-semibold hover:border-[var(--chat-border-hover)]"
        >
          Back to chats
        </Link>
      </div>
    );
  }

  if (!conversation) {
    return <div className="border-b border-[var(--chat-border)] px-5 py-3" />;
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
    <div className="flex items-center justify-between border-b border-[var(--chat-border)] bg-[rgba(22,18,38,0.7)] px-5 py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="relative flex-shrink-0">
          {conversation.isGroup ? (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--chat-violet)] to-[#5b4bc4]">
              <Users className="h-4 w-4 text-white" />
            </div>
          ) : (
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-[var(--chat-amber-light)] to-[#d97706] text-xs font-semibold text-[var(--chat-amber-ink)]">
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
              className={`presence-lamp absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-[var(--chat-list)] ${
                online ? "bg-[var(--chat-green)]" : "bg-[#4a4364]"
              }`}
            />
          )}
        </div>
        <div className="min-w-0">
          <div className="font-display truncate text-sm font-semibold">
            {title}
          </div>
          <div
            className={`truncate text-[11px] ${
              typing.length > 0
                ? "text-[var(--chat-amber)]"
                : showLamp && online
                  ? "text-[var(--chat-green)]"
                  : "text-[var(--chat-text-tertiary)]"
            }`}
          >
            {typingLabel}
          </div>
        </div>
      </div>

      <button
        onClick={() => setPanelOpen(true)}
        className="flex items-center gap-1.5 rounded-lg border border-[var(--chat-border)] px-2.5 py-1.5 text-xs text-[var(--chat-text-secondary)] transition-colors hover:border-[var(--chat-border-hover)] hover:text-[var(--chat-text)]"
      >
        <Users className="h-3.5 w-3.5" />
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
