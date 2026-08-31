"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Heart,
  MessageCircle,
  Share2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Globe,
  Users,
  Lock,
} from "lucide-react";
import { Card } from "@/components/ui-kit/card";
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
} from "@/components/ui-kit/avatar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui-kit/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui-kit/alert-dialog";
import { MediaGallery } from "@/components/posts/media-gallery";
import { useAuth } from "@/contexts/auth-context";
import { timeAgo, initials, cn } from "@/lib/utils";
import {
  togglePostLike,
  updatePost,
  deletePost,
  type PostCardModel,
} from "@/lib/posts";

const visibilityIcon = {
  PUBLIC: Globe,
  FOLLOWERS: Users,
  PRIVATE: Lock,
} as const;

export function PostCard({
  post,
  queryKey,
}: {
  post: PostCardModel;
  queryKey: string[];
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isOwn = post.userId === user?.userId;
  const [editing, setEditing] = useState(false);
  const [editContent, setEditContent] = useState(post.content);
  const [editVisibility, setEditVisibility] = useState(post.visibility);

  const VisibilityIcon =
    visibilityIcon[post.visibility as keyof typeof visibilityIcon] ?? Globe;

  const { mutate: toggleLike } = useMutation({
    mutationFn: () => togglePostLike(post.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ["post", post.id] });
      await queryClient.invalidateQueries({ queryKey: ["postLikes", post.id] });
    },
  });

  const { mutate: saveEdit, isPending: savingEdit } = useMutation({
    mutationFn: () =>
      updatePost(post.id, {
        content: editContent,
        visibility: editVisibility,
      }),
    onSuccess: async () => {
      setEditing(false);
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ["post", post.id] });
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: () => deletePost(post.id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey });
      await queryClient.invalidateQueries({ queryKey: ["post", post.id] });
    },
  });

  const share = async () => {
    const url = `${window.location.origin}/posts/${post.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // clipboard unavailable; ignore
    }
  };

  return (
    <Card className="p-0">
      <div className="p-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/profile/${post.creator?.userName ?? ""}`}
            className="shrink-0"
          >
            <Avatar className="h-10 w-10">
              {post.creator?.avatarUrl && (
                <AvatarImage
                  src={post.creator.avatarUrl}
                  alt={post.creator?.displayName ?? ""}
                />
              )}
              <AvatarFallback>
                {initials(post.creator?.displayName)}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/profile/${post.creator?.userName ?? ""}`}
              className="block truncate text-sm font-semibold text-foreground hover:underline"
            >
              {post.creator?.displayName ?? "Unknown"}
            </Link>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              @{post.creator?.userName ?? "unknown"} · {timeAgo(post.createdAt)}{" "}
              · <VisibilityIcon className="h-3 w-3" />
            </p>
          </div>
          {isOwn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" aria-label="Post actions">
                  <MoreHorizontal className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <DropdownMenuItem
                  onClick={() => {
                    setEditing(true);
                    setEditContent(post.content);
                    setEditVisibility(post.visibility);
                  }}
                >
                  <Pencil className="h-4 w-4" /> Edit
                </DropdownMenuItem>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      variant="destructive"
                      onSelect={(e) => e.preventDefault()}
                    >
                      <Trash2 className="h-4 w-4" /> Delete
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete this post?</AlertDialogTitle>
                      <AlertDialogDescription>
                        &quot;{post.content.slice(0, 80)}
                        {post.content.length > 80 ? "…" : ""}&quot; will be
                        permanently removed.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction
                        className="bg-destructive text-white hover:bg-destructive/90"
                        onClick={() => remove()}
                      >
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {editing ? (
          <div className="mt-4 flex flex-col gap-3">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              rows={4}
            />
            <div className="flex items-center justify-between gap-3">
              <Select value={editVisibility} onValueChange={setEditVisibility}>
                <SelectTrigger className="w-32" size="sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">Public</SelectItem>
                  <SelectItem value="FOLLOWERS">Followers</SelectItem>
                  <SelectItem value="PRIVATE">Private</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button
                  disabled={savingEdit || !editContent.trim()}
                  onClick={() => saveEdit()}
                >
                  {savingEdit && <Spinner className="size-4" />}
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 whitespace-pre-wrap break-words text-sm text-foreground/90">
            {post.content}
          </p>
        )}

        <MediaGallery assets={post.postsAssets} />

        <div className="mt-4 flex items-center gap-1 border-t border-[var(--ts-border)] pt-3">
          <Button
            variant="ghost"
            onClick={() => toggleLike()}
            className="gap-1.5 text-sm text-[var(--ts-text-secondary)]"
          >
            <Heart
              className={cn(
                "h-4 w-4",
                post.likedByMe &&
                  "fill-[var(--ts-danger)] text-[var(--ts-danger)]",
              )}
            />
            {post._count?.postLikes ?? 0}
          </Button>
          <Link
            href={`/posts/${post.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-[var(--ts-text-secondary)] transition-colors hover:bg-accent hover:text-foreground"
          >
            <MessageCircle className="h-4 w-4" />
            {post._count?.comments ?? 0}
          </Link>
          <Button
            variant="ghost"
            onClick={share}
            className="gap-1.5 text-sm text-[var(--ts-text-secondary)]"
          >
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </div>
      </div>
    </Card>
  );
}
