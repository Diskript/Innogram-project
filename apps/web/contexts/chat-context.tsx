"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useSocket } from "@/contexts/socket-context";
import { useAuth } from "@/contexts/auth-context";
import { markConversationRead } from "@/lib/chat";
import type { ChatConversation, ChatMessage } from "@/lib/chat";

type MessagesPage = {
  data: ChatMessage[];
  total: number;
  skip: number;
  take: number;
};

interface ChatContextValue {
  totalUnread: number;
  activeConversationId: string | null;
  setActiveConversationId: (id: string | null) => void;
  typingBy: (conversationId: string) => string[];
  isOnline: (userId: string) => boolean;
  markTyping: (conversationId: string) => void;
  joinConversation: (conversationId: string) => void;
  leaveConversation: (conversationId: string) => void;
  markRead: (conversationId: string) => Promise<void>;
}

const ChatContext = createContext<ChatContextValue | null>(null);

const TYPING_TTL_MS = 4000;
const TYPING_IDLE_MS = 2000;

export function ChatProvider({ children }: { children: ReactNode }) {
  const socket = useSocket();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [activeConversationId, setActiveConversationId] = useState<
    string | null
  >(null);
  const [typingMap, setTypingMap] = useState<Map<string, Map<string, number>>>(
    new Map(),
  );
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [totalUnread, setTotalUnread] = useState(0);
  const typingTimers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const activeIdRef = useRef<string | null>(null);

  useEffect(() => {
    activeIdRef.current = activeConversationId;
  }, [activeConversationId]);

  const recomputeTotalUnread = useCallback(() => {
    const list = queryClient.getQueryData<{
      data: ChatConversation[];
    }>(["chat", "conversations"]);
    const total = (list?.data ?? []).reduce(
      (sum, c) => sum + (c.unreadCount || 0),
      0,
    );
    setTotalUnread(total);
  }, [queryClient]);

  const bumpUnread = useCallback(
    (conversationId: string) => {
      queryClient.setQueryData<{ data: ChatConversation[] }>(
        ["chat", "conversations"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((c) =>
              c.id === conversationId
                ? { ...c, unreadCount: (c.unreadCount || 0) + 1 }
                : c,
            ),
          };
        },
      );
      recomputeTotalUnread();
    },
    [queryClient, recomputeTotalUnread],
  );

  const zeroUnread = useCallback(
    (conversationId: string) => {
      queryClient.setQueryData<{ data: ChatConversation[] }>(
        ["chat", "conversations"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((c) =>
              c.id === conversationId ? { ...c, unreadCount: 0 } : c,
            ),
          };
        },
      );
      recomputeTotalUnread();
    },
    [queryClient, recomputeTotalUnread],
  );

  const upsertMessage = useCallback(
    (message: ChatMessage) => {
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        ["chat", "messages", message.conversationId],
        (old) => {
          if (!old) return old;
          const lastPage = old.pages[old.pages.length - 1];
          const pages = [...old.pages];
          const withoutDup = lastPage.data.filter((m) => m.id !== message.id);
          pages[pages.length - 1] = {
            ...lastPage,
            data: [...withoutDup, message],
            total: lastPage.total + 1,
          };
          return { ...old, pages };
        },
      );
    },
    [queryClient],
  );

  const patchMessage = useCallback(
    (
      conversationId: string,
      messageId: string,
      patch: Partial<ChatMessage>,
    ) => {
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        ["chat", "messages", conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.map((m) =>
                m.id === messageId ? { ...m, ...patch } : m,
              ),
            })),
          };
        },
      );
    },
    [queryClient],
  );

  const removeMessage = useCallback(
    (conversationId: string, messageId: string) => {
      queryClient.setQueryData<InfiniteData<MessagesPage>>(
        ["chat", "messages", conversationId],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            pages: old.pages.map((page) => ({
              ...page,
              data: page.data.filter((m) => m.id !== messageId),
            })),
          };
        },
      );
    },
    [queryClient],
  );

  const setTyping = useCallback(
    (conversationId: string, userId: string, active: boolean) => {
      setTypingMap((old) => {
        const next = new Map(old);
        const convo = new Map(next.get(conversationId) ?? []);
        if (active) {
          convo.set(userId, Date.now() + TYPING_TTL_MS);
        } else {
          convo.delete(userId);
        }
        if (convo.size === 0) {
          next.delete(conversationId);
        } else {
          next.set(conversationId, convo);
        }
        return next;
      });
    },
    [],
  );

  useEffect(() => {
    if (!socket) {
      return;
    }

    const onConnect = () => {
      void queryClient.invalidateQueries({ queryKey: ["chat"] });
      if (activeIdRef.current) {
        socket.emit("join:conversation", {
          conversationId: activeIdRef.current,
        });
      }
    };

    const onMessageNew = (payload: {
      conversationId: string;
      senderId: string;
      message?: ChatMessage;
    }) => {
      if (!payload.message) return;
      if (payload.senderId === user?.userId) return;

      upsertMessage(payload.message);

      queryClient.setQueryData<{ data: ChatConversation[] }>(
        ["chat", "conversations"],
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: [...old.data].sort((a, b) =>
              (b.lastMessage?.createdAt ?? b.updatedAt).localeCompare(
                a.lastMessage?.createdAt ?? a.updatedAt,
              ),
            ),
          };
        },
      );
      queryClient.setQueryData<ChatConversation>(
        ["chat", "conversation", payload.conversationId],
        (old) => (old ? { ...old, lastMessage: { ...payload.message! } } : old),
      );

      if (activeIdRef.current === payload.conversationId) {
        void markConversationRead(payload.conversationId);
      } else {
        bumpUnread(payload.conversationId);
      }
      setTyping(payload.conversationId, payload.senderId, false);
    };

    const onMessageUpdated = (payload: {
      conversationId: string;
      messageId: string;
      content: string;
      updatedAt: string;
    }) => {
      patchMessage(payload.conversationId, payload.messageId, {
        content: payload.content,
        updatedAt: payload.updatedAt,
      });
    };

    const onMessageDeleted = (payload: {
      conversationId: string;
      messageId: string;
    }) => {
      removeMessage(payload.conversationId, payload.messageId);
    };

    const onConversationCreated = () => {
      void queryClient.invalidateQueries({
        queryKey: ["chat", "conversations"],
      });
    };

    const onParticipantChanged = (payload: {
      conversationId: string;
      userId: string;
    }) => {
      void queryClient.invalidateQueries({
        queryKey: ["chat", "conversations"],
      });
      void queryClient.invalidateQueries({
        queryKey: ["chat", "conversation", payload.conversationId],
      });
    };

    const onConversationDeleted = (payload: { conversationId: string }) => {
      queryClient.removeQueries({
        queryKey: ["chat", "messages", payload.conversationId],
      });
      void queryClient.invalidateQueries({
        queryKey: ["chat", "conversations"],
      });
      if (activeIdRef.current === payload.conversationId) {
        setActiveConversationId(null);
      }
    };

    const onPresence = (payload: { userId: string; online: boolean }) => {
      setOnlineUsers((old) => {
        const next = new Set(old);
        if (payload.online) {
          next.add(payload.userId);
        } else {
          next.delete(payload.userId);
        }
        return next;
      });
    };

    const onTypingUpdate = (payload: {
      conversationId: string;
      userId: string;
    }) => {
      setTyping(payload.conversationId, payload.userId, true);
    };

    const onTypingStop = (payload: {
      conversationId: string;
      userId: string;
    }) => {
      setTyping(payload.conversationId, payload.userId, false);
    };

    socket.on("connect", onConnect);
    socket.on("message.new", onMessageNew);
    socket.on("message.updated", onMessageUpdated);
    socket.on("message.deleted", onMessageDeleted);
    socket.on("conversation.created", onConversationCreated);
    socket.on("participant.added", onParticipantChanged);
    socket.on("participant.left", onParticipantChanged);
    socket.on("conversation.deleted", onConversationDeleted);
    socket.on("presence:update", onPresence);
    socket.on("typing:update", onTypingUpdate);
    socket.on("typing:stop", onTypingStop);

    return () => {
      socket.off("connect", onConnect);
      socket.off("message.new", onMessageNew);
      socket.off("message.updated", onMessageUpdated);
      socket.off("message.deleted", onMessageDeleted);
      socket.off("conversation.created", onConversationCreated);
      socket.off("participant.added", onParticipantChanged);
      socket.off("participant.left", onParticipantChanged);
      socket.off("conversation.deleted", onConversationDeleted);
      socket.off("presence:update", onPresence);
      socket.off("typing:update", onTypingUpdate);
      socket.off("typing:stop", onTypingStop);
    };
  }, [
    socket,
    user?.userId,
    queryClient,
    upsertMessage,
    patchMessage,
    removeMessage,
    bumpUnread,
    setTyping,
  ]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTypingMap((old) => {
        const now = Date.now();
        let changed = false;
        const next = new Map<string, Map<string, number>>();
        for (const [conversationId, users] of old) {
          const kept = new Map(
            [...users].filter(([, expiry]) => {
              const keep = expiry > now;
              if (!keep) changed = true;
              return keep;
            }),
          );
          if (kept.size > 0) next.set(conversationId, kept);
        }
        return changed ? next : old;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const markTyping = useCallback(
    (conversationId: string) => {
      if (!socket) return;
      if (!typingTimers.current.has(conversationId)) {
        socket.emit("typing:start", { conversationId });
      }
      const existing = typingTimers.current.get(conversationId);
      if (existing) clearTimeout(existing);
      typingTimers.current.set(
        conversationId,
        setTimeout(() => {
          socket.emit("typing:stop", { conversationId });
          typingTimers.current.delete(conversationId);
        }, TYPING_IDLE_MS),
      );
    },
    [socket],
  );

  const joinConversation = useCallback(
    (conversationId: string) => {
      socket?.emit("join:conversation", { conversationId });
    },
    [socket],
  );

  const leaveConversation = useCallback(
    (conversationId: string) => {
      socket?.emit("leave:conversation", { conversationId });
    },
    [socket],
  );

  const markRead = useCallback(
    async (conversationId: string) => {
      await markConversationRead(conversationId);
      zeroUnread(conversationId);
    },
    [zeroUnread],
  );

  const typingBy = useCallback(
    (conversationId: string) => [
      ...(typingMap.get(conversationId)?.keys() ?? []),
    ],
    [typingMap],
  );

  const isOnline = useCallback(
    (userId: string) => onlineUsers.has(userId),
    [onlineUsers],
  );

  const value = useMemo(
    () => ({
      totalUnread,
      activeConversationId,
      setActiveConversationId,
      typingBy,
      isOnline,
      markTyping,
      joinConversation,
      leaveConversation,
      markRead,
    }),
    [
      totalUnread,
      activeConversationId,
      typingBy,
      isOnline,
      markTyping,
      joinConversation,
      leaveConversation,
      markRead,
    ],
  );

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

export function useChat(): ChatContextValue {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChat must be used within a ChatProvider");
  }
  return context;
}
