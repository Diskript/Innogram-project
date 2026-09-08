"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn, initials } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useChat } from "@/contexts/chat-context";
import { useNotifications } from "@/contexts/notifications-context";
import {
  Home,
  User,
  Settings,
  LogOut,
  Search,
  MessageCircle,
  Bell,
} from "lucide-react";
import { Button } from "@/components/ui-kit/button";
import { Avatar, AvatarFallback } from "@/components/ui-kit/avatar";

const navItems = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/profile/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { totalUnread } = useChat();
  const { unreadCount } = useNotifications();

  return (
    <aside className="flex w-64 flex-col border-r border-[var(--ts-border)] bg-[var(--ts-list)] p-4">
      <Link
        href="/"
        className="font-display mb-8 text-xl font-semibold text-foreground"
      >
        Innogram
      </Link>
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.href === "/"
              ? pathname === "/"
              : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "airmail-active text-foreground"
                  : "text-[var(--ts-text-secondary)] hover:bg-[var(--ts-bubble)] hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
              {item.href === "/chat" && totalUnread > 0 && (
                <span className="glow-soft ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-gradient-to-br from-[var(--ts-amber-light)] via-[var(--ts-amber-mid)] to-[var(--ts-amber-deep)] px-1.5 text-[10px] font-bold text-[var(--ts-amber-ink)]">
                  {totalUnread > 99 ? "99+" : totalUnread}
                </span>
              )}
              {item.href === "/notifications" && unreadCount > 0 ? (
                <span className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-blue-600 px-1.5 text-xs font-semibold text-white">
                  {unreadCount > 99 ? "99+" : unreadCount}
                </span>
              ) : null}
            </Link>
          );
        })}
      </nav>
      <div className="mt-auto border-t border-[var(--ts-border)] pt-4">
        <div className="mb-3 flex items-center gap-3 px-3">
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">
              {initials(user?.email)}
            </AvatarFallback>
          </Avatar>
          <span className="truncate text-sm font-medium text-foreground">
            {user?.email}
          </span>
        </div>
        <Button
          variant="ghost"
          className="w-full justify-start gap-3 text-[var(--ts-text-secondary)]"
          onClick={logout}
        >
          <LogOut className="h-5 w-5" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
