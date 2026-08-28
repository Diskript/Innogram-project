"use client";

import type { LucideIcon } from "lucide-react";

export function EmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon?: LucideIcon;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      {Icon ? <Icon className="h-8 w-8 text-neutral-400" /> : null}
      <h3 className="text-sm font-semibold text-neutral-900 dark:text-white">
        {title}
      </h3>
      {description ? (
        <p className="max-w-sm text-sm text-neutral-500">{description}</p>
      ) : null}
    </div>
  );
}
