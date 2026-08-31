"use client";

import { UserListPage } from "@/components/social/user-list-page";
import { useAuth } from "@/contexts/auth-context";
import { Spinner } from "@/components/ui/spinner";

export default function MyFollowingPage() {
  const { user } = useAuth();

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  return <UserListPage userId={user.userId} mode="following" />;
}
