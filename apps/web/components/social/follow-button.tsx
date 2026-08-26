"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserPlus, UserX, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFollowStatus, toggleFollow } from "@/lib/social";

export function FollowButton({ userId }: { userId: string }) {
  const queryClient = useQueryClient();

  const { data } = useQuery({
    queryKey: ["followStatus", userId],
    queryFn: () => getFollowStatus(userId),
  });

  const { mutate, isPending } = useMutation({
    mutationFn: () => toggleFollow(userId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["followStatus", userId],
      });
      await queryClient.invalidateQueries({ queryKey: ["profile"] });
      await queryClient.invalidateQueries({ queryKey: ["followers"] });
      await queryClient.invalidateQueries({ queryKey: ["following"] });
    },
  });

  const status = data?.status ?? "none";

  if (status === "self") {
    return null;
  }

  if (status === "following") {
    return (
      <Button
        variant="secondary"
        isLoading={isPending}
        onClick={() => mutate()}
      >
        <UserX className="h-4 w-4" /> Unfollow
      </Button>
    );
  }

  if (status === "pending") {
    return (
      <Button variant="secondary" disabled>
        <Clock className="h-4 w-4" /> Requested
      </Button>
    );
  }

  return (
    <Button isLoading={isPending} onClick={() => mutate()}>
      <UserPlus className="h-4 w-4" /> Follow
    </Button>
  );
}
