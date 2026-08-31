"use client";

import { useMemo, useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, X } from "lucide-react";
import { Card } from "@/components/ui-kit/card";
import { Button } from "@/components/ui-kit/button";
import { Textarea } from "@/components/ui-kit/textarea";
import { Spinner } from "@/components/ui-kit/spinner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui-kit/select";
import { createPost, uploadAssets } from "@/lib/posts";

interface PendingFile {
  localId: string;
  file: File;
  previewUrl: string;
}

export function PostComposer({ queryKey }: { queryKey: string[] }) {
  const queryClient = useQueryClient();
  const [content, setContent] = useState("");
  const [visibility, setVisibility] = useState("PUBLIC");
  const [pending, setPending] = useState<PendingFile[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const previews = useMemo(() => pending.map((p) => p.previewUrl), [pending]);

  const onPickFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    const next: PendingFile[] = files.map((file, i) => ({
      localId: `${Date.now()}-${i}`,
      file,
      previewUrl: URL.createObjectURL(file),
    }));
    setPending((prev) => [...prev, ...next]);
    e.target.value = "";
  };

  const removePending = (localId: string) => {
    setPending((prev) => {
      const target = prev.find((p) => p.localId === localId);
      if (target) URL.revokeObjectURL(target.previewUrl);
      return prev.filter((p) => p.localId !== localId);
    });
  };

  const { mutate: publish, isPending: posting } = useMutation({
    mutationFn: async () => {
      let assetIds: string[] = [];
      if (pending.length > 0) {
        const assets = await uploadAssets(
          pending.map((p) => p.file),
          visibility,
        );
        assetIds = assets.map((a) => a.id);
      }
      return createPost({
        content: content.trim(),
        visibility,
        assetIds,
      });
    },
    onSuccess: async () => {
      setContent("");
      setVisibility("PUBLIC");
      previews.forEach((url) => URL.revokeObjectURL(url));
      setPending([]);
      await queryClient.invalidateQueries({ queryKey });
    },
  });

  const canSubmit =
    (content.trim().length > 0 || pending.length > 0) && !posting;

  return (
    <Card>
      <div className="flex flex-col gap-3">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={3}
          placeholder="What's happening?"
          maxLength={1000}
        />
        {pending.length > 0 ? (
          <div className="grid grid-cols-4 gap-2">
            {pending.map((p) => {
              const isVideo = p.file.type.startsWith("video/");
              return (
                <div
                  key={p.localId}
                  className="relative aspect-square overflow-hidden rounded-lg bg-[var(--ts-bubble)]"
                >
                  {isVideo ? (
                    <video
                      src={p.previewUrl}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={p.previewUrl}
                      alt="preview"
                      className="h-full w-full object-cover"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => removePending(p.localId)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-1 text-white"
                    aria-label="Remove file"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        ) : null}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              aria-label="Attach media"
            >
              <ImagePlus className="h-5 w-5" />
            </Button>
            <Select value={visibility} onValueChange={setVisibility}>
              <SelectTrigger className="w-32" size="sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PUBLIC">Public</SelectItem>
                <SelectItem value="FOLLOWERS">Followers</SelectItem>
                <SelectItem value="PRIVATE">Private</SelectItem>
              </SelectContent>
            </Select>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              hidden
              onChange={onPickFiles}
            />
          </div>
          <Button disabled={!canSubmit} onClick={() => publish()}>
            {posting && <Spinner className="size-4" />}
            Post
          </Button>
        </div>
      </div>
    </Card>
  );
}
