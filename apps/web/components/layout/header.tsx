"use client";

import { useAuth } from "@/contexts/auth-context";
import { initials } from "@/lib/utils";
import { Avatar, AvatarFallback } from "@/components/ui-kit/avatar";

export function Header() {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-end border-b border-[var(--ts-border)] bg-[var(--ts-panel)] px-6">
      <div className="flex items-center gap-3">
        <span className="text-sm text-[var(--ts-text-secondary)]">
          {user?.email}
        </span>
        <Avatar className="h-8 w-8">
          <AvatarFallback className="text-xs">
            {initials(user?.email)}
          </AvatarFallback>
        </Avatar>
      </div>
    </header>
  );
}
