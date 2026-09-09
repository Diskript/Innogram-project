"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-kit/select";

export type SortMode = "newest" | "oldest" | "likes";
export type FilterMode = "all" | "media";

export function FeedToolbar({
  sort,
  setSort,
  filter,
  setFilter,
}: {
  sort: SortMode;
  setSort: (v: SortMode) => void;
  filter: FilterMode;
  setFilter: (v: FilterMode) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <Select value={sort} onValueChange={(v) => setSort(v as SortMode)}>
        <SelectTrigger className="w-36" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="newest">Newest</SelectItem>
          <SelectItem value="oldest">Oldest</SelectItem>
          <SelectItem value="likes">Most liked</SelectItem>
        </SelectContent>
      </Select>
      <Select value={filter} onValueChange={(v) => setFilter(v as FilterMode)}>
        <SelectTrigger className="w-36" size="sm">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All posts</SelectItem>
          <SelectItem value="media">With media</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
