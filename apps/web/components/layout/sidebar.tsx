"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Bell,
  ChevronUp,
  Home,
  LogOut,
  MessageCircle,
  Search,
  Settings,
  User,
  Zap,
} from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui-kit/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui-kit/dropdown-menu";
import { cn, initials } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";
import { useChat } from "@/contexts/chat-context";
import { useNotifications } from "@/contexts/notifications-context";

const navItems = [
  { href: "/", label: "Feed", icon: Home },
  { href: "/search", label: "Search", icon: Search },
  { href: "/chat", label: "Chat", icon: MessageCircle },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/profile", label: "Profile", icon: User },
  { href: "/profile/settings", label: "Settings", icon: Settings },
];

function NavBadge({ count }: { count: number }) {
  return (
    <span className="font-meta ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] font-medium tabular-nums text-primary-foreground">
      {count > 99 ? "99+" : count}
    </span>
  );
}

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const { totalUnread } = useChat();
  const { unreadCount } = useNotifications();

  return (
    <aside className="hidden w-60 shrink-0 flex-col border-r border-border bg-background px-3 py-4 lg:flex">
      <Link
        href="/"
        className="flex h-14 items-center gap-2.5 rounded-lg px-2 transition-colors hover:bg-accent"
      >
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Zap className="size-3.5" />
        </span>
        <span className="font-display text-[15px] font-semibold tracking-tight">
          Innogram
        </span>
      </Link>

      <p className="font-meta mb-2 mt-6 px-2 text-[11px] font-medium uppercase tracking-[0.08em] text-muted-foreground/60">
        Menu
      </p>
      <nav className="flex flex-col gap-1" aria-label="Main navigation">
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
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "flex h-9 max-lg:h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
                isActive
                  ? "bg-white/[0.07] text-foreground"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground",
              )}
            >
              <Icon
                className={cn(
                  "size-4",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              />
              {item.label}
              {item.href === "/chat" && totalUnread > 0 && (
                <NavBadge count={totalUnread} />
              )}
              {item.href === "/notifications" && unreadCount > 0 && (
                <NavBadge count={unreadCount} />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto border-t border-border pt-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="group flex w-full items-center gap-2.5 rounded-lg p-2 text-left transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label="Account menu"
            >
              <Avatar className="size-7">
                <AvatarFallback className="text-xs">
                  {initials(user?.email)}
                </AvatarFallback>
              </Avatar>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                {user?.email}
              </span>
              <ChevronUp className="size-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56">
            <DropdownMenuLabel className="font-meta text-xs font-normal text-muted-foreground">
              {user?.email}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={logout}>
              <LogOut className="size-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}
