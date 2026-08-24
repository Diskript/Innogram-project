"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Search as SearchIcon, FileSearch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { PostCard } from "@/components/posts/post-card";
import { searchPosts, toPostCardModel } from "@/lib/posts";

function SearchPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const q = params.get("q") ?? "";
  const [draft, setDraft] = useState(q);

  const { data, isLoading } = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchPosts(q, 0, 20),
    enabled: q.length > 0,
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = draft.trim();
    if (trimmed) router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <form onSubmit={submit} className="flex gap-2">
        <Input
          aria-label="Search posts"
          placeholder="Search posts..."
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
        />
        <Button type="submit">
          <SearchIcon className="h-4 w-4" /> Search
        </Button>
      </form>

      {!q ? (
        <EmptyState
          icon={FileSearch}
          title="Search posts"
          description="Search public posts by content or a tag."
        />
      ) : isLoading ? (
        <Skeleton className="h-32 w-full" />
      ) : (data?.data.length ?? 0) === 0 ? (
        <EmptyState
          icon={FileSearch}
          title="No results"
          description={`Nothing found for "${q}".`}
        />
      ) : (
        <div className="flex flex-col gap-4">
          {(data?.data ?? []).map((post) => (
            <PostCard
              key={post.id}
              post={toPostCardModel(post)}
              queryKey={["search", q]}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<Skeleton className="h-32 w-full" />}>
      <SearchPageInner />
    </Suspense>
  );
}
