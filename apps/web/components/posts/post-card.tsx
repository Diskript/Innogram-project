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
import { Card } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { MediaGallery } from "@/components/posts/media-gallery";
import { useAuth } from "@/contexts/auth-context";
import { timeAgo, cn } from "@/lib/utils";
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
  const [menuOpen, setMenuOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
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

  const itemHover = "hover:bg-neutral-100 dark:hover:bg-neutral-800";

  return (
    <Card noPadding>
      <div className="p-6">
        <div className="flex items-center gap-3">
          <Link
            href={`/profile/${post.creator?.userName ?? ""}`}
            className="shrink-0"
          >
            <Avatar
              size="md"
              src={post.creator?.avatarUrl}
              alt={post.creator?.displayName ?? ""}
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              href={`/profile/${post.creator?.userName ?? ""}`}
              className="block truncate text-sm font-semibold text-neutral-900 hover:underline dark:text-white"
            >
              {post.creator?.displayName ?? "Unknown"}
            </Link>
            <p className="flex items-center gap-1 text-xs text-neutral-500">
              @{post.creator?.userName ?? "unknown"} · {timeAgo(post.createdAt)}{" "}
              · <VisibilityIcon className="h-3 w-3" />
            </p>
          </div>
          {isOwn ? (
            <div className="relative">
              <Button
                variant="ghost"
                className="px-2 py-2"
                onClick={() => setMenuOpen((v) => !v)}
                aria-label="Post actions"
              >
                <MoreHorizontal className="h-5 w-5" />
              </Button>
              {menuOpen ? (
                <div className="absolute right-0 top-full z-10 mt-1 w-40 rounded-lg border border-neutral-200 bg-white p-1 shadow-sm dark:border-neutral-700 dark:bg-neutral-900">
                  <button
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-neutral-700 dark:text-neutral-300",
                      itemHover,
                    )}
                    onClick={() => {
                      setEditing(true);
                      setMenuOpen(false);
                    }}
                  >
                    <Pencil className="h-4 w-4" /> Edit
                  </button>
                  <button
                    className={cn(
                      "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20",
                    )}
                    onClick={() => {
                      setConfirmDelete(true);
                      setMenuOpen(false);
                    }}
                  >
                    <Trash2 className="h-4 w-4" /> Delete
                  </button>
                </div>
              ) : null}
            </div>
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
              <Select
                value={editVisibility}
                onChange={setEditVisibility}
                options={[
                  { value: "PUBLIC", label: "Public" },
                  { value: "FOLLOWERS", label: "Followers" },
                  { value: "PRIVATE", label: "Private" },
                ]}
              />
              <div className="flex gap-2">
                <Button variant="secondary" onClick={() => setEditing(false)}>
                  Cancel
                </Button>
                <Button
                  isLoading={savingEdit}
                  disabled={!editContent.trim()}
                  onClick={() => saveEdit()}
                >
                  Save
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <p className="mt-3 whitespace-pre-wrap break-words text-sm text-neutral-800 dark:text-neutral-200">
            {post.content}
          </p>
        )}

        <MediaGallery assets={post.postsAssets} />

        <div className="mt-4 flex items-center gap-1 border-t border-neutral-100 pt-3 dark:border-neutral-800">
          <Button
            variant="ghost"
            onClick={() => toggleLike()}
            className="gap-1.5 text-sm text-neutral-600"
          >
            <Heart
              className={cn(
                "h-4 w-4",
                post.likedByMe && "fill-red-500 text-red-500",
              )}
            />
            {post._count?.postLikes ?? 0}
          </Button>
          <Link
            href={`/posts/${post.id}`}
            className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-neutral-600 transition-colors hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
          >
            <MessageCircle className="h-4 w-4" />
            {post._count?.comments ?? 0}
          </Link>
          <Button
            variant="ghost"
            onClick={share}
            className="gap-1.5 text-sm text-neutral-600"
          >
            <Share2 className="h-4 w-4" /> Share
          </Button>
        </div>
      </div>

      {confirmDelete ? (
        <div className="border-t border-neutral-200 px-6 py-3 dark:border-neutral-700">
          <p className="mb-2 text-sm text-neutral-700 dark:text-neutral-300">
            Delete this post permanently?
          </p>
          <div className="flex gap-2">
            <Button variant="danger" onClick={() => remove()}>
              Delete
            </Button>
            <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </Card>
  );
}
