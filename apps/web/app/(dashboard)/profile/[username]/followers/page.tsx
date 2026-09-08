"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { UserListPage } from "@/components/social/user-list-page";
import { getPublicProfile } from "@/lib/api-client";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function UserFollowersPage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const [userId, setUserId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!username) return;
      try {
        const profile = await getPublicProfile(username);
        if (cancelled) return;
        setUserId(profile.id);
      } catch {
        if (cancelled) return;
        setError("User not found");
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [username]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card className="p-6 text-sm text-neutral-500">{error}</Card>
      </div>
    );
  }

  if (!userId) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-2">
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  return <UserListPage userId={userId} username={username} mode="followers" />;
}
