"use client";

import { Select } from "@/components/ui/select";

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
      <Select
        value={sort}
        onChange={(v) => setSort(v as SortMode)}
        options={[
          { value: "newest", label: "Newest" },
          { value: "oldest", label: "Oldest" },
          { value: "likes", label: "Most liked" },
        ]}
      />
      <Select
        value={filter}
        onChange={(v) => setFilter(v as FilterMode)}
        options={[
          { value: "all", label: "All posts" },
          { value: "media", label: "With media" },
        ]}
      />
    </div>
  );
}
