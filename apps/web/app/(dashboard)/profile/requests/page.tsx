"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { UserCheck, Clock } from "lucide-react";
import {
  getIncomingRequests,
  getOutgoingRequests,
  acceptFollowRequest,
  rejectFollowRequest,
} from "@/lib/social";
import { UserRow } from "@/components/social/user-row";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

export default function FollowRequestsPage() {
  const queryClient = useQueryClient();

  const incoming = useQuery({
    queryKey: ["followRequests", "incoming"],
    queryFn: getIncomingRequests,
  });

  const outgoing = useQuery({
    queryKey: ["followRequests", "outgoing"],
    queryFn: getOutgoingRequests,
  });

  const invalidateAll = async () => {
    await queryClient.invalidateQueries({ queryKey: ["followRequests"] });
    await queryClient.invalidateQueries({ queryKey: ["profile"] });
  };

  const { mutate: accept } = useMutation({
    mutationFn: (userId: string) => acceptFollowRequest(userId),
    onSuccess: invalidateAll,
  });

  const { mutate: reject } = useMutation({
    mutationFn: (userId: string) => rejectFollowRequest(userId),
    onSuccess: invalidateAll,
  });

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
          <UserCheck className="h-5 w-5" /> Follow requests
        </h2>
        {incoming.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (incoming.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No pending requests"
            description="Requests to follow you will appear here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {(incoming.data ?? []).map((user) => (
              <UserRow
                key={user.id}
                user={user}
                showAcceptReject
                onAccept={(id) => accept(id)}
                onReject={(id) => reject(id)}
              />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-neutral-900 dark:text-white">
          <Clock className="h-5 w-5" /> Sent requests
        </h2>
        {outgoing.isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : (outgoing.data?.length ?? 0) === 0 ? (
          <EmptyState
            title="No sent requests"
            description="Requests you sent to private accounts will appear here."
          />
        ) : (
          <div className="flex flex-col gap-2">
            {(outgoing.data ?? []).map((user) => (
              <UserRow key={user.id} user={user} showFollow />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
