"use client";

import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { getAssetBlobUrl } from "@/lib/media";
import { Skeleton } from "@/components/ui-kit/skeleton";
import type { FeedAsset, FeedPostAsset } from "@/lib/posts";
import { cn } from "@/lib/utils";

function useAssetUrl(assetId: string) {
  return useQuery({
    queryKey: ["assetBlob", assetId],
    queryFn: () => getAssetBlobUrl(assetId),
    staleTime: 60 * 60 * 1000,
  });
}

function ProcessingBadge() {
  return (
    <div className="absolute right-2 top-2 z-10 flex items-center gap-1 rounded-full bg-[var(--ts-bubble)] px-2 py-1 text-xs text-[var(--ts-muted)] shadow">
      <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
      <span>Processing</span>
    </div>
  );
}

function AssetFrame({
  asset,
  className,
  children,
}: {
  asset: FeedAsset;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("relative", className)}>
      {asset.processingStatus === "PENDING" && <ProcessingBadge />}
      {children}
    </div>
  );
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
      <div className="mt-3 overflow-hidden rounded-lg bg-[var(--ts-bubble)]">
        <AssetFrame asset={asset}>
          <AssetVideo asset={asset} className="max-h-[480px]" />
        </AssetFrame>
      </div>
    ) : (
      <div className="mt-3 max-h-[480px] overflow-hidden rounded-lg bg-[var(--ts-bubble)]">
        <AssetFrame asset={asset}>
          <AssetImage
            asset={asset}
            alt="post media"
            className="max-h-[480px]"
          />
        </AssetFrame>
      </div>
    );
  }
  return (
    <div className="mt-3 grid grid-cols-2 gap-1">
      {assets.slice(0, 4).map(({ asset }) =>
        asset.fileType.startsWith("video/") ? (
          <div
            key={asset.id}
            className="aspect-square overflow-hidden rounded-lg bg-[var(--ts-bubble)]"
          >
            <AssetFrame asset={asset}>
              <AssetVideo asset={asset} className="h-full w-full" />
            </AssetFrame>
          </div>
        ) : (
          <div
            key={asset.id}
            className="aspect-square overflow-hidden rounded-lg bg-[var(--ts-bubble)]"
          >
            <AssetFrame asset={asset}>
              <AssetImage asset={asset} alt="post media" />
            </AssetFrame>
          </div>
        ),
      )}
    </div>
  );
}
