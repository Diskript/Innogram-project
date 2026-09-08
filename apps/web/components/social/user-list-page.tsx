"use client";

import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import {
  getUserFollowers,
  getUserFollowing,
  type FollowUser,
} from "@/lib/social";
import { UserRow } from "@/components/social/user-row";
import { Button } from "@/components/ui-kit/button";
import { Skeleton } from "@/components/ui-kit/skeleton";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui-kit/empty";

type Mode = "followers" | "following";

function List({ userId, mode }: { userId: string; mode: Mode }) {
  const queryFn = (skip: number) =>
    mode === "followers"
      ? getUserFollowers(userId, skip)
      : getUserFollowing(userId, skip);

  const query = useInfiniteQuery({
    queryKey: [mode, userId],
    queryFn: ({ pageParam }) => queryFn((pageParam as number) ?? 0),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.data.length > 0
        ? lastPage.skip + lastPage.data.length
        : undefined,
  });

  const users: FollowUser[] = query.data?.pages.flatMap((p) => p.data) ?? [];

  if (query.isLoading) {
    return (
      <div className="flex flex-col gap-2">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Users />
          </EmptyMedia>
          <EmptyTitle>
            {mode === "followers"
              ? "No followers yet"
              : "Not following anyone yet"}
          </EmptyTitle>
          <EmptyDescription>
            {mode === "followers"
              ? "People who follow this user will appear here."
              : "People this user follows will appear here."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {users.map((user) => (
          <UserRow key={user.id} user={user} showFollow />
        ))}
      </div>
      {query.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            disabled={query.isFetchingNextPage}
            onClick={() => query.fetchNextPage()}
          >
            Load more
          </Button>
        </div>
      ) : null}
    </>
  );
}

export function UserListPage({
  userId,
  username,
  mode,
}: {
  userId: string;
  username?: string;
  mode: Mode;
}) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <h1 className="text-lg font-semibold text-neutral-900 dark:text-white">
        {mode === "followers" ? "Followers" : "Following"}
        {username ? (
          <span className="ml-2 text-sm font-normal text-neutral-500">
            <Link
              href={`/profile/${username}`}
              className="hover:text-neutral-900 dark:hover:text-white"
            >
              @{username}
            </Link>
          </span>
        ) : null}
      </h1>
      <List userId={userId} mode={mode} />
    </div>
  );
}
