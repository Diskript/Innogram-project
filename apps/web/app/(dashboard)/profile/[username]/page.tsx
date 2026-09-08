"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Lock, Users } from "lucide-react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Spinner } from "@/components/ui/spinner";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PostCard } from "@/components/posts/post-card";
import { FollowButton } from "@/components/social/follow-button";
import {
  ApiError,
  getPublicProfile,
  type PublicProfile,
} from "@/lib/api-client";
import { getUserPosts, toPostCardModel } from "@/lib/posts";
import { useAuth } from "@/contexts/auth-context";
import { getFollowStatus, type FollowStatus } from "@/lib/social";

function StatLink({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link href={href} className="text-center hover:opacity-80">
      <p className="text-lg font-semibold text-neutral-900 dark:text-white">
        {value}
      </p>
      <p className="text-xs text-neutral-500">{label}</p>
    </Link>
  );
}

export default function PublicProfilePage() {
  const params = useParams<{ username: string }>();
  const username = params?.username ?? "";
  const { user } = useAuth();

  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isOwn, setIsOwn] = useState(false);
  const [followStatus, setFollowStatus] = useState<FollowStatus>("none");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!username) {
        setStatus("error");
        setErrorMessage("Missing username");
        return;
      }
      try {
        const result = await getPublicProfile(username);
        if (cancelled) return;
        setProfile(result);
        const own = user?.userId === result.id;
        setIsOwn(own);
        if (!own) {
          try {
            const { status: fs } = await getFollowStatus(result.id);
            if (!cancelled) setFollowStatus(fs);
          } catch {
            // keep "none"
          }
        }
        setStatus("ready");
      } catch (err) {
        if (cancelled) return;
        setStatus("error");
        setErrorMessage(
          err instanceof ApiError && err.status === 404
            ? `User "@${username}" not found`
            : "Failed to load this profile",
        );
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [username, user?.userId]);

  const posts = useInfiniteQuery({
    queryKey: ["profilePosts", username],
    queryFn: ({ pageParam }) =>
      getUserPosts(profile?.id ?? "", (pageParam as number) ?? 0),
    initialPageParam: 0,
    enabled: status === "ready" && !!profile,
    getNextPageParam: (lastPage) =>
      lastPage.data.length > 0
        ? lastPage.skip + lastPage.data.length
        : undefined,
  });

  const showPrivatePanel =
    status === "ready" &&
    !isOwn &&
    !profile?.isPublic &&
    followStatus !== "following";

  if (status === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (status === "error" || !profile) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle>Profile unavailable</CardTitle>
            <CardDescription>{errorMessage}</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Card noPadding>
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-4">
            <Avatar
              size="lg"
              src={profile.avatarUrl}
              alt={profile.displayName || profile.userName}
            />
            <div className="min-w-0 flex-1">
              <CardTitle>{profile.displayName || profile.userName}</CardTitle>
              <CardDescription>@{profile.userName}</CardDescription>
            </div>
            {!isOwn ? <FollowButton userId={profile.id} /> : null}
          </div>
          {profile.bio ? (
            <p className="text-sm text-neutral-600 dark:text-neutral-300">
              {profile.bio}
            </p>
          ) : null}
          <div className="flex items-center gap-6">
            <StatLink
              label="Posts"
              value={profile._count?.createdPosts ?? 0}
              href="?tab=posts"
            />
            <StatLink
              label="Followers"
              value={profile._count?.followers ?? 0}
              href={`/profile/${profile.userName}/followers`}
            />
            <StatLink
              label="Following"
              value={profile._count?.following ?? 0}
              href={`/profile/${profile.userName}/following`}
            />
          </div>
        </div>
      </Card>

      {showPrivatePanel ? (
        <div className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-neutral-400" />
                <CardTitle className="text-base">
                  This account is private
                </CardTitle>
              </div>
              <CardDescription>
                Follow @{profile.userName} to see their posts.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      ) : null}

      <div className="mt-4 flex flex-col gap-4">
        {posts.isLoading ? <Skeleton className="h-40 w-full" /> : null}
        {!posts.isLoading &&
        (posts.data?.pages.flatMap((p) => p.data).length ?? 0) === 0 ? (
          <EmptyState
            icon={Users}
            title="No posts"
            description="This user hasn't posted anything yet."
          />
        ) : (
          posts.data?.pages
            .flatMap((p) => p.data)
            .map(toPostCardModel)
            .map((post) => (
              <PostCard
                key={post.id}
                post={post}
                queryKey={["profilePosts", username]}
              />
            ))
        )}
        {posts.hasNextPage ? (
          <div className="flex justify-center">
            <Button
              variant="secondary"
              isLoading={posts.isFetchingNextPage}
              onClick={() => posts.fetchNextPage()}
            >
              Load more
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
