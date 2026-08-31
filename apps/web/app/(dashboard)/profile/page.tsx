"use client";

import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { Settings, Users } from "lucide-react";
import { useAuth } from "@/contexts/auth-context";
import { getOwnProfile } from "@/lib/api-client";
import { getUserPosts, toPostCardModel } from "@/lib/posts";
import { PostCard } from "@/components/posts/post-card";
import { Avatar } from "@/components/ui/avatar";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";

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

export default function OwnProfilePage() {
  const { user } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile"],
    queryFn: getOwnProfile,
  });

  const posts = useInfiniteQuery({
    queryKey: ["profilePosts"],
    queryFn: ({ pageParam }) =>
      getUserPosts(user!.userId, (pageParam as number) ?? 0),
    initialPageParam: 0,
    enabled: !!user,
    getNextPageParam: (lastPage) =>
      lastPage.data.length > 0
        ? lastPage.skip + lastPage.data.length
        : undefined,
  });

  if (isLoading || !profile) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  const postModels =
    posts.data?.pages.flatMap((p) => p.data.map(toPostCardModel)) ?? [];

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Card noPadding>
        <div className="flex flex-col gap-4 p-6">
          <div className="flex items-center gap-4">
            <Avatar
              size="lg"
              src={profile.avatarUrl}
              alt={profile.displayName}
            />
            <div className="min-w-0 flex-1">
              <CardTitle>{profile.displayName || profile.userName}</CardTitle>
              <CardDescription>@{profile.userName}</CardDescription>
            </div>
            <Link href="/profile/settings">
              <Button variant="secondary">
                <Settings className="h-4 w-4" /> Edit profile
              </Button>
            </Link>
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
              href="/profile/followers"
            />
            <StatLink
              label="Following"
              value={profile._count?.following ?? 0}
              href="/profile/following"
            />
          </div>
        </div>
      </Card>

      <div className="flex flex-col gap-4">
        {postModels.length === 0 && !posts.isLoading ? (
          <EmptyState
            icon={Users}
            title="No posts yet"
            description="Share your first post from the feed."
          />
        ) : (
          postModels.map((post) => (
            <PostCard key={post.id} post={post} queryKey={["profilePosts"]} />
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
