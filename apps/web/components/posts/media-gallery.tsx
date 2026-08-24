"use client";

import { useQuery } from "@tanstack/react-query";
import { getAssetBlobUrl } from "@/lib/media";
import { Skeleton } from "@/components/ui/skeleton";
import type { FeedAsset, FeedPostAsset } from "@/lib/posts";
import { cn } from "@/lib/utils";

function useAssetUrl(assetId: string) {
  return useQuery({
    queryKey: ["assetBlob", assetId],
    queryFn: () => getAssetBlobUrl(assetId),
    staleTime: 60 * 60 * 1000,
  });
}

export function AssetImage({
  asset,
  alt = "",
  className,
}: {
  asset: FeedAsset;
  alt?: string;
  className?: string;
}) {
  const { data, isLoading } = useAssetUrl(asset.id);
  if (isLoading || !data) {
    return <Skeleton className={cn("h-full w-full", className)} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={data}
      alt={alt}
      className={cn("h-full w-full object-cover", className)}
      loading="lazy"
    />
  );
}

export function AssetVideo({
  asset,
  className,
}: {
  asset: FeedAsset;
  className?: string;
}) {
  const { data, isLoading } = useAssetUrl(asset.id);
  if (isLoading || !data) {
    return <Skeleton className={cn("aspect-video w-full", className)} />;
  }
  return (
    <video
      src={data}
      controls
      className={cn("w-full", className)}
      preload="metadata"
    />
  );
}

export function MediaGallery({ assets }: { assets: FeedPostAsset[] }) {
  if (assets.length === 0) return null;
  if (assets.length === 1) {
    const { asset } = assets[0];
    return asset.fileType.startsWith("video/") ? (
      <div className="mt-3 overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
        <AssetVideo asset={asset} className="max-h-[480px]" />
      </div>
    ) : (
      <div className="mt-3 max-h-[480px] overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900">
        <AssetImage asset={asset} alt="post media" className="max-h-[480px]" />
      </div>
    );
  }
  return (
    <div className="mt-3 grid grid-cols-2 gap-1">
      {assets.slice(0, 4).map(({ asset }) =>
        asset.fileType.startsWith("video/") ? (
          <div
            key={asset.id}
            className="aspect-square overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900"
          >
            <AssetVideo asset={asset} className="h-full w-full" />
          </div>
        ) : (
          <div
            key={asset.id}
            className="aspect-square overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-900"
          >
            <AssetImage asset={asset} alt="post media" />
          </div>
        ),
      )}
    </div>
  );
}
