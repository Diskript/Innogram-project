"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/api-client";
import { getUnreadCount, markAllNotificationsRead } from "@/lib/notifications";
import { useAuth } from "@/contexts/auth-context";

interface NotificationsContextValue {
  unreadCount: number;
  refreshUnread: () => Promise<void>;
  markAllRead: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue | null>(
  null,
);

function wsUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  return `${base.replace(/^http/, "ws")}/ws`;
}

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef<Socket | null>(null);

  const refreshUnread = useCallback(async () => {
    try {
      const { count } = await getUnreadCount();
      setUnreadCount(count);
    } catch {
      // ignore; count stays as-is
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      socketRef.current?.disconnect();
      socketRef.current = null;
      return;
    }

    const token = getAccessToken();
    if (!token) {
      return;
    }

    const timer = setTimeout(() => {
      void refreshUnread();
    }, 0);

    const socket = io(wsUrl(), {
      auth: { token },
      transports: ["websocket"],
    });
    socketRef.current = socket;

    socket.on("connect", () => {
      void refreshUnread();
    });

    socket.on("notification.created", () => {
      setUnreadCount((c) => c + 1);
    });

    return () => {
      clearTimeout(timer);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [isAuthenticated, refreshUnread]);

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead();
    setUnreadCount(0);
  }, []);

  return (
    <NotificationsContext.Provider
      value={{ unreadCount, refreshUnread, markAllRead }}
    >
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotifications(): NotificationsContextValue {
  const context = useContext(NotificationsContext);
  if (!context) {
    throw new Error(
      "useNotifications must be used within a NotificationsProvider",
    );
  }
  return context;
}
