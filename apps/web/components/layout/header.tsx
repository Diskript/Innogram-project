"use client";

import { useAuth } from "@/contexts/auth-context";
import { Avatar } from "@/components/ui/avatar";

export function Header() {
  const { user } = useAuth();

  return (
    <header className="flex h-16 items-center justify-end border-b border-neutral-200 bg-white px-6 dark:border-neutral-800 dark:bg-neutral-950">
      <div className="flex items-center gap-3">
        <span className="text-sm text-neutral-600 dark:text-neutral-400">
          {user?.email}
        </span>
        <Avatar size="sm" alt={user?.email || ""} />
      </div>
    </header>
  );
}