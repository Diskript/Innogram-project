"use client";

import { type ReactNode, useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthProvider } from "@/contexts/auth-context";
import { SocketProvider } from "@/contexts/socket-context";
import { ChatProvider } from "@/contexts/chat-context";
import { NotificationsProvider } from "@/contexts/notifications-context";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30 * 1000,
            retry: 1,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <NotificationsProvider>
          <SocketProvider>
            <ChatProvider>{children}</ChatProvider>
          </SocketProvider>
        </NotificationsProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
