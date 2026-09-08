"use client";

import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { Bell, Check } from "lucide-react";
import Link from "next/link";
import { useNotifications } from "@/contexts/notifications-context";
import {
  getNotifications,
  markNotificationRead,
  type NotificationItem,
} from "@/lib/notifications";
import {
  Avatar,
  AvatarImage,
  AvatarFallback,
} from "@/components/ui-kit/avatar";
import { Button } from "@/components/ui-kit/button";
import { Skeleton } from "@/components/ui-kit/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui-kit/empty";
import { timeAgo, cn, initials } from "@/lib/utils";

const typeLabel: Record<string, string> = {
  FOLLOW: "started following you",
  LIKE: "liked your post",
  COMMENT: "commented on your post",
  MENTION: "mentioned you",
};

function notificationLink(item: NotificationItem): string | null {
  if ((item.type === "LIKE" || item.type === "COMMENT") && item.entityId) {
    return `/posts/${item.entityId}`;
  }
  return null;
}

export default function NotificationsPage() {
  const queryClient = useQueryClient();
  const { markAllRead, refreshUnread } = useNotifications();

  const query = useInfiniteQuery({
    queryKey: ["notifications"],
    queryFn: ({ pageParam }) => getNotifications((pageParam as number) ?? 0),
    initialPageParam: 0,
    getNextPageParam: (lastPage) =>
      lastPage.data.length > 0
        ? lastPage.skip + lastPage.data.length
        : undefined,
  });

  const { mutate: markRead } = useMutation({
    mutationFn: (id: string) => markNotificationRead(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
      await refreshUnread();
    },
  });

  const { mutate: markAll, isPending: markingAll } = useMutation({
    mutationFn: () => markAllRead(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const items = query.data?.pages.flatMap((p) => p.data) ?? [];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
          <Bell className="h-5 w-5" /> Notifications
        </h1>
        <div className="flex items-center gap-2">
          <Link
            href="/notifications/settings"
            className="text-sm text-neutral-500 hover:text-neutral-900 dark:hover:text-white"
          >
            Notification settings
          </Link>
          <Button
            variant="secondary"
            disabled={markingAll}
            onClick={() => markAll()}
          >
            Mark all read
          </Button>
        </div>
      </div>

      {query.isLoading ? (
        <div className="flex flex-col gap-2">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : null}

      {!query.isLoading && items.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <Bell />
            </EmptyMedia>
            <EmptyTitle>No notifications</EmptyTitle>
            <EmptyDescription>
              Likes, comments, follows, and mentions will show up here.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : null}

      <div className="flex flex-col gap-2">
        {items.map((item) => {
          const href = notificationLink(item);
          const row = (
            <div
              key={item.id}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-3 dark:border-neutral-800 dark:bg-neutral-950",
                !item.read &&
                  "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/40",
              )}
            >
              <Avatar>
                {item.actor.avatarUrl ? (
                  <AvatarImage
                    src={item.actor.avatarUrl}
                    alt={item.actor.displayName}
                  />
                ) : null}
                <AvatarFallback>
                  {initials(item.actor.displayName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-neutral-800 dark:text-neutral-200">
                  <span className="font-semibold">
                    {item.actor.displayName}
                  </span>{" "}
                  {typeLabel[item.type] ??
                    `sent a ${item.type.toLowerCase()} notification`}
                </p>
                <p className="text-xs text-neutral-500">
                  {timeAgo(item.createdAt)}
                </p>
              </div>
              {!item.read ? (
                <Button
                  variant="ghost"
                  onClick={() => markRead(item.id)}
                  aria-label="Mark as read"
                >
                  <Check className="h-4 w-4" />
                </Button>
              ) : null}
            </div>
          );
          return href ? (
            <Link key={item.id} href={href}>
              {row}
            </Link>
          ) : (
            row
          );
        })}
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
    </div>
  );
}
