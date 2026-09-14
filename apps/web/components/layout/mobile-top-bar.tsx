"use client";

import Link from "next/link";
import { LogOut, Zap } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui-kit/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui-kit/dropdown-menu";
import { initials } from "@/lib/utils";
import { useAuth } from "@/contexts/auth-context";

export function MobileTopBar() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur lg:hidden">
      <Link href="/" className="flex items-center gap-2.5">
        <span className="flex size-6 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Zap className="size-3.5" />
        </span>
        <span className="font-display text-[15px] font-semibold tracking-tight">
          Innogram
        </span>
      </Link>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className="flex size-11 items-center justify-center rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
            aria-label="Account menu"
          >
            <Avatar className="size-8">
              <AvatarFallback className="text-xs">
                {initials(user?.email)}
              </AvatarFallback>
            </Avatar>
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="font-meta text-xs font-normal text-muted-foreground">
            {user?.email}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive" onClick={logout}>
            <LogOut className="size-4" /> Log out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
