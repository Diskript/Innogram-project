"use client";

import {
  createContext,
  useContext,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { io, type Socket } from "socket.io-client";
import { getAccessToken } from "@/lib/api-client";
import { useAuth } from "@/contexts/auth-context";

const SocketContext = createContext<Socket | null>(null);

function wsUrl(): string {
  const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
  return `${base.replace(/^http/, "ws")}/ws`;
}

let socketInstance: Socket | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot(): Socket | null {
  return socketInstance;
}

function getServerSnapshot(): Socket | null {
  return null;
}

function connectSocket(): void {
  if (socketInstance) {
    return;
  }
  const token = getAccessToken();
  if (!token) {
    return;
  }
  const socket = io(wsUrl(), {
    auth: { token },
    transports: ["websocket"],
  });
  socketInstance = socket;
  notify();
}

function disconnectSocket(): void {
  if (!socketInstance) {
    return;
  }
  socketInstance.disconnect();
  socketInstance = null;
  notify();
}

export function SocketProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      connectSocket();
    } else {
      disconnectSocket();
    }
  }, [isAuthenticated]);

  const socket = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
}

export function useSocket(): Socket | null {
  return useContext(SocketContext);
}
