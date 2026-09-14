"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Home, MessageCircle, Search, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useChat } from "@/contexts/chat-context";
import { useNotifications } from "@/contexts/notifications-context";

const tabs = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
];

export function MobileNav() {
  const pathname = usePathname();
  const { totalUnread } = useChat();
  const { unreadCount } = useNotifications();

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex h-14 max-w-lg items-stretch">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive =
            tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          const badge =
            tab.href === "/chat"
              ? totalUnread
              : tab.href === "/notifications"
                ? unreadCount
                : 0;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              aria-label={tab.label}
              className="relative flex flex-1 flex-col items-center justify-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            >
              <span className="relative">
                <Icon
                  className={cn(
                    "size-5",
                    isActive ? "text-primary" : "text-muted-foreground",
                  )}
                />
                {badge > 0 && (
                  <span className="font-meta absolute -right-2 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-medium tabular-nums text-primary-foreground">
                    {badge > 99 ? "99+" : badge}
                  </span>
                )}
              </span>
              <span
                className={cn(
                  "text-[10px] font-medium",
                  isActive ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {tab.label}
              </span>
              {isActive && (
                <span className="absolute bottom-1 size-1 rounded-full bg-primary" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
