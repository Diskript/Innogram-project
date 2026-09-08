"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown } from "lucide-react";
import { getMessages } from "@/lib/chat";
import { MessageItem } from "@/components/chat/message-item";

const PAGE_SIZE = 50;
const NEAR_BOTTOM_PX = 120;

export function MessageList({ conversationId }: { conversationId: string }) {
  const queryClient = useQueryClient();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showNewMessages, setShowNewMessages] = useState(false);
  const preserveRef = useRef<number | null>(null);
  const nearBottomRef = useRef(true);

  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["chat", "messages", conversationId],
      initialPageParam: undefined as number | undefined,
      queryFn: async ({ pageParam }) => {
        if (pageParam === undefined) {
          const head = await getMessages(conversationId, { skip: 0, take: 1 });
          const skip = Math.max(head.total - PAGE_SIZE, 0);
          return getMessages(conversationId, { skip, take: PAGE_SIZE });
        }
        return getMessages(conversationId, {
          skip: pageParam,
          take: PAGE_SIZE,
        });
      },
      getNextPageParam: (lastPage) =>
        lastPage.skip > 0 ? Math.max(lastPage.skip - PAGE_SIZE, 0) : undefined,
    });

  const ascending = useMemo(() => {
    if (!data) return [];
    return [...data.pages]
      .reverse()
      .flatMap((page) => [...page.data].reverse());
  }, [data]);

  const atBottom = () => {
    const el = scrollRef.current;
    if (!el) return true;
    return el.scrollHeight - el.scrollTop - el.clientHeight < NEAR_BOTTOM_PX;
  };

  const scrollToBottom = useCallback((smooth = true) => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTo({ top: el.scrollHeight, behavior: smooth ? "smooth" : "auto" });
  }, []);

  useEffect(() => {
    if (!data) return;
    const el = scrollRef.current;
    if (!el) return;

    if (preserveRef.current !== null) {
      el.scrollTop = el.scrollHeight - preserveRef.current;
      preserveRef.current = null;
      return;
    }
    if (nearBottomRef.current) {
      scrollToBottom(false);
    }
  }, [data, scrollToBottom]);

  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      const key = event.query.queryKey;
      if (
        event.type === "updated" &&
        key[0] === "chat" &&
        key[1] === "messages" &&
        key[2] === conversationId &&
        !nearBottomRef.current
      ) {
        setShowNewMessages(true);
      }
    });
    return unsubscribe;
  }, [queryClient, conversationId]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;

    const near = atBottom();
    nearBottomRef.current = near;
    if (near) {
      setShowNewMessages(false);
    }

    if (el.scrollTop < 40 && hasNextPage && !isFetchingNextPage) {
      preserveRef.current = el.scrollHeight;
      void fetchNextPage();
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center text-sm text-[var(--chat-text-tertiary)]">
        Loading messages…
      </div>
    );
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="chat-aurora h-full overflow-y-auto px-5 py-4"
      >
        {hasNextPage && (
          <div className="pb-3 text-center text-[11px] text-[var(--chat-text-tertiary)]">
            {isFetchingNextPage ? "Loading history…" : ""}
          </div>
        )}
        {ascending.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--chat-text-tertiary)]">
            No messages yet. Say hi!
          </div>
        ) : (
          ascending.map((message, index) => {
            const prev = ascending[index - 1];
            const showDate =
              !prev ||
              new Date(prev.createdAt).toDateString() !==
                new Date(message.createdAt).toDateString();
            return (
              <div key={message.id}>
                {showDate && (
                  <div className="my-3 flex justify-center">
                    <span className="rounded-full border border-[var(--chat-border)] bg-[var(--chat-list)] px-3 py-1 text-[10.5px] tracking-wide text-[var(--chat-text-tertiary)]">
                      {new Date(message.createdAt).toLocaleDateString(
                        undefined,
                        { month: "short", day: "numeric", year: "numeric" },
                      )}
                    </span>
                  </div>
                )}
                <MessageItem
                  message={message}
                  conversationId={conversationId}
                  compact={
                    !showDate &&
                    prev !== undefined &&
                    prev.senderId === message.senderId
                  }
                />
              </div>
            );
          })
        )}
      </div>

      {showNewMessages && (
        <button
          onClick={() => {
            setShowNewMessages(false);
            nearBottomRef.current = true;
            scrollToBottom();
          }}
          className="glow-soft absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-1.5 rounded-full bg-gradient-to-br from-[var(--chat-amber-light)] to-[var(--chat-amber-deep)] px-3 py-1.5 text-xs font-semibold text-[var(--chat-amber-ink)]"
        >
          <ArrowDown className="h-3.5 w-3.5" /> New messages
        </button>
      )}
    </div>
  );
}
