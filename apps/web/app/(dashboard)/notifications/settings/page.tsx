"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellOff } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui-kit/card";
import { Switch } from "@/components/ui-kit/switch";
import { Skeleton } from "@/components/ui-kit/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui-kit/empty";
import {
  getNotificationPreferences,
  updateNotificationPreferences,
  type NotificationPreferences,
} from "@/lib/notifications";

const prefRows: {
  key: keyof NotificationPreferences;
  title: string;
  description: string;
}[] = [
  {
    key: "followEnabled",
    title: "New followers",
    description: "Someone starts following you",
  },
  {
    key: "likeEnabled",
    title: "Post likes",
    description: "Someone likes your post",
  },
  {
    key: "commentEnabled",
    title: "Comments",
    description: "Someone comments on your post",
  },
  {
    key: "mentionEnabled",
    title: "Mentions",
    description: "Someone mentions you (@username)",
  },
];

export default function NotificationSettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["notificationPreferences"],
    queryFn: getNotificationPreferences,
  });

  const { mutate: save, isPending } = useMutation({
    mutationFn: (dto: Partial<NotificationPreferences>) =>
      updateNotificationPreferences(dto),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["notificationPreferences"],
      });
    },
  });

  if (isLoading) {
    return (
      <div className="mx-auto max-w-2xl">
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!data) {
    return (
      <div className="mx-auto max-w-2xl">
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <BellOff />
            </EmptyMedia>
            <EmptyTitle>Preferences unavailable</EmptyTitle>
            <EmptyDescription>Try reloading the page.</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle>Notification preferences</CardTitle>
          <CardDescription>
            Choose which notifications you want to receive
          </CardDescription>
        </CardHeader>
        <div className="flex flex-col divide-y divide-neutral-100 dark:divide-neutral-800">
          {prefRows.map((row) => (
            <div
              key={row.key}
              className="flex items-center justify-between gap-4 px-6 py-4"
            >
              <div>
                <p className="text-sm font-medium text-neutral-900 dark:text-white">
                  {row.title}
                </p>
                <p className="text-sm text-neutral-500 dark:text-neutral-400">
                  {row.description}
                </p>
              </div>
              <Switch
                id={row.key}
                checked={data[row.key]}
                disabled={isPending}
                onCheckedChange={(checked) => save({ [row.key]: checked })}
              />
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
