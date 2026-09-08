"use client";

import Link from "next/link";
import { Check, X } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { FollowButton } from "@/components/social/follow-button";
import type { FollowUser } from "@/lib/social";

interface UserRowProps {
  user: FollowUser;
  showFollow?: boolean;
  showAcceptReject?: boolean;
  onAccept?: (userId: string) => void;
  onReject?: (userId: string) => void;
}

export function UserRow({
  user,
  showFollow = false,
  showAcceptReject = false,
  onAccept,
  onReject,
}: UserRowProps) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950">
      <Link href={`/profile/${user.userName}`} className="shrink-0">
        <Avatar size="md" src={user.avatarUrl} alt={user.displayName} />
      </Link>
      <div className="min-w-0 flex-1">
        <Link
          href={`/profile/${user.userName}`}
          className="block truncate text-sm font-semibold text-neutral-900 hover:underline dark:text-white"
        >
          {user.displayName}
        </Link>
        <p className="truncate text-xs text-neutral-500">@{user.userName}</p>
      </div>
      {showAcceptReject && onAccept && onReject ? (
        <div className="flex shrink-0 items-center gap-1">
          <Button
            variant="secondary"
            onClick={() => onAccept(user.id)}
            aria-label={`Accept ${user.displayName}`}
          >
            <Check className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            onClick={() => onReject(user.id)}
            aria-label={`Reject ${user.displayName}`}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : null}
      {showFollow ? <FollowButton userId={user.id} /> : null}
    </div>
  );
}
