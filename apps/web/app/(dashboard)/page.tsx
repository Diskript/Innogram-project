"use client";

import { useMemo, useState } from "react";
import { useInfiniteQuery } from "@tanstack/react-query";
import { ImageOff } from "lucide-react";
import { getFeed, toPostCardModel } from "@/lib/posts";
import { PostCard } from "@/components/posts/post-card";
import { PostComposer } from "@/components/posts/post-composer";
import {
  FeedToolbar,
  type SortMode,
  type FilterMode,
} from "@/components/posts/feed-toolbar";
import { Button } from "@/components/ui-kit/button";
import { Spinner } from "@/components/ui-kit/spinner";
import { Skeleton } from "@/components/ui-kit/skeleton";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui-kit/empty";

export default function FeedPage() {
  const [sort, setSort] = useState<SortMode>("newest");
  const [filter, setFilter] = useState<FilterMode>("all");

  const feed = useInfiniteQuery({
    queryKey: ["feed"],
    queryFn: ({ pageParam }) => getFeed((pageParam as string | null) ?? null),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) =>
      lastPage.hasMore ? lastPage.nextCursor : undefined,
  });

  const allPosts = useMemo(
    () => feed.data?.pages.flatMap((page) => page.data) ?? [],
    [feed.data],
  );

  const visiblePosts = useMemo(() => {
    const filtered =
      filter === "all"
        ? allPosts
        : allPosts.filter((p) => p.postsAssets.length > 0);
    const sorted = [...filtered];
    if (sort === "newest") {
      sorted.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    } else if (sort === "oldest") {
      sorted.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
    } else {
      sorted.sort(
        (a, b) => (b._count?.postLikes ?? 0) - (a._count?.postLikes ?? 0),
      );
    }
    return sorted.map(toPostCardModel);
  }, [allPosts, sort, filter]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <PostComposer queryKey={["feed"]} />
      <FeedToolbar
        sort={sort}
        setSort={setSort}
        filter={filter}
        setFilter={setFilter}
      />

      {feed.isLoading ? (
        <div className="flex flex-col gap-4">
          <Skeleton className="h-40 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      ) : null}

      {!feed.isLoading && visiblePosts.length === 0 ? (
        <Empty>
          <EmptyHeader>
            <EmptyMedia variant="icon">
              <ImageOff />
            </EmptyMedia>
            <EmptyTitle>No posts yet</EmptyTitle>
            <EmptyDescription>
              Posts from people you follow and public accounts will appear here.
              Try creating one above.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      ) : (
        <div className="flex flex-col gap-4">
          {visiblePosts.map((post) => (
            <PostCard key={post.id} post={post} queryKey={["feed"]} />
          ))}
        </div>
      )}

      {feed.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="secondary"
            disabled={feed.isFetchingNextPage}
            onClick={() => feed.fetchNextPage()}
          >
            {feed.isFetchingNextPage && <Spinner className="size-4" />}
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  );
}
