import type { ReactNode } from "react";

export const mockAuth = {
  user: null as { userId: string; email: string } | null,
  isLoading: false,
  isAuthenticated: false,
  login: jest.fn(),
  register: jest.fn(),
  logout: jest.fn(),
  googleLogin: jest.fn(),
};

export const mockChat = {
  totalUnread: 0,
  activeConversationId: null as string | null,
  setActiveConversationId: jest.fn(),
  typingBy: jest.fn(() => [] as string[]),
  isOnline: jest.fn(() => false),
  markTyping: jest.fn(),
  joinConversation: jest.fn(),
  leaveConversation: jest.fn(),
  markRead: jest.fn(),
};

export const mockNotifications = {
  unreadCount: 0,
  refreshUnread: jest.fn(),
  markAllRead: jest.fn(),
};

jest.mock("@/contexts/auth-context", () => ({
  useAuth: () => mockAuth,
  AuthProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/contexts/chat-context", () => ({
  useChat: () => mockChat,
  ChatProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/contexts/socket-context", () => ({
  useSocket: () => null,
  SocketProvider: ({ children }: { children: ReactNode }) => children,
}));

jest.mock("@/contexts/notifications-context", () => ({
  useNotifications: () => mockNotifications,
  NotificationsProvider: ({ children }: { children: ReactNode }) => children,
}));
