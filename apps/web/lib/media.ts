import { api } from "@/lib/api-client";

const blobCache = new Map<string, string>();

export async function getAssetBlobUrl(assetId: string): Promise<string> {
  const cached = blobCache.get(assetId);
  if (cached) return cached;
  const blob = await api.getBlob(`/assets/${assetId}/download`);
  const url = URL.createObjectURL(blob);
  blobCache.set(assetId, url);
  return url;
}
