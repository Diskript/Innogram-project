"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Pencil, Trash2, Reply } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { MentionText } from "@/components/social/mention-text";
import { MentionInput } from "@/components/social/mention-input";
import { timeAgo, cn } from "@/lib/utils";
import {
  getComments,
  createComment,
  updateComment,
  deleteComment,
  toggleCommentLike,
  type CommentItem,
} from "@/lib/posts";
import { useAuth } from "@/contexts/auth-context";

export function CommentsSection({ postId }: { postId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [replyTarget, setReplyTarget] = useState<CommentItem | null>(null);
  const [draft, setDraft] = useState("");
  const [topDraft, setTopDraft] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState("");
  const [likedComments, setLikedComments] = useState<Record<string, boolean>>(
    {},
  );

  const { data, isLoading } = useQuery({
    queryKey: ["comments", postId],
    queryFn: () => getComments(postId),
  });

  const invalidateComments = () =>
    queryClient.invalidateQueries({ queryKey: ["comments", postId] });

  const { mutate: add, isPending: adding } = useMutation({
    mutationFn: () =>
      createComment(
        postId,
        replyTarget
          ? { content: draft.trim(), parentCommentId: replyTarget.id }
          : { content: draft.trim() },
      ),
    onSuccess: async () => {
      setDraft("");
      setReplyTarget(null);
      await invalidateComments();
    },
  });

  const { mutate: addTop, isPending: addingTop } = useMutation({
    mutationFn: () => createComment(postId, { content: topDraft.trim() }),
    onSuccess: async () => {
      setTopDraft("");
      await invalidateComments();
    },
  });

  const { mutate: saveEdit, isPending: savingEdit } = useMutation({
    mutationFn: () => updateComment(editingId!, editDraft.trim()),
    onSuccess: async () => {
      setEditingId(null);
      await invalidateComments();
    },
  });

  const { mutate: remove } = useMutation({
    mutationFn: (id: string) => deleteComment(id),
    onSuccess: invalidateComments,
  });

  const { mutate: toggleLike } = useMutation({
    mutationFn: (id: string) => toggleCommentLike(id),
    onSuccess: async (_res, id) => {
      await invalidateComments();
      setLikedComments((prev) => ({ ...prev, [id]: !prev[id] }));
    },
  });

  const renderComment = (comment: CommentItem, isReply = false) => {
    const isOwn = comment.userId === user?.userId;
    const liked = likedComments[comment.id] ?? false;
    return (
      <div key={comment.id} className={cn("flex gap-3", isReply && "ml-10")}>
        <Avatar
          size="sm"
          src={comment.user.avatarUrl}
          alt={comment.user.displayName}
        />
        <div className="min-w-0 flex-1">
          <div className="rounded-xl rounded-tl-none bg-neutral-100 px-3 py-2 dark:bg-neutral-800">
            <p className="text-xs font-semibold text-neutral-900 dark:text-white">
              {comment.user.displayName}
            </p>
            {editingId === comment.id ? (
              <div className="mt-1 flex flex-col gap-2">
                <MentionInput
                  value={editDraft}
                  onChange={setEditDraft}
                  rows={2}
                />
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    onClick={() => setEditingId(null)}
                  >
                    Cancel
                  </Button>
                  <Button
                    isLoading={savingEdit}
                    disabled={!editDraft.trim()}
                    onClick={() => saveEdit()}
                  >
                    Save
                  </Button>
                </div>
              </div>
            ) : (
              <div className="mt-0.5">
                <MentionText content={comment.content} />
              </div>
            )}
          </div>
          <div className="mt-1 flex items-center gap-3 text-xs text-neutral-500">
            <span>{timeAgo(comment.createdAt)}</span>
            <button
              className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white"
              onClick={() => toggleLike(comment.id)}
            >
              <Heart
                className={cn(
                  "h-3.5 w-3.5",
                  liked && "fill-red-500 text-red-500",
                )}
              />
              {comment._count?.commentLikes ?? 0}
            </button>
            {!isReply ? (
              <button
                className="flex items-center gap-1 hover:text-neutral-900 dark:hover:text-white"
                onClick={() => {
                  setReplyTarget(
                    replyTarget?.id === comment.id ? null : comment,
                  );
                  setDraft("");
                }}
              >
                <Reply className="h-3.5 w-3.5" /> Reply
              </button>
            ) : null}
            {isOwn ? (
              <>
                <button
                  className="hover:text-neutral-900 dark:hover:text-white"
                  onClick={() => {
                    setEditingId(comment.id);
                    setEditDraft(comment.content);
                  }}
                  aria-label="Edit comment"
                >
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button
                  className="hover:text-red-600"
                  onClick={() => remove(comment.id)}
                  aria-label="Delete comment"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </>
            ) : null}
          </div>
          {replyTarget?.id === comment.id ? (
            <div className="mt-2 flex flex-col gap-2">
              <MentionInput
                value={draft}
                onChange={setDraft}
                rows={2}
                placeholder={`Reply to @${comment.user.userName}`}
              />
              <div className="flex gap-2">
                <Button
                  isLoading={adding}
                  disabled={!draft.trim()}
                  onClick={() => add()}
                >
                  Reply
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => setReplyTarget(null)}
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : null}
          {comment.childComments.length > 0
            ? comment.childComments.map((child) => renderComment(child, true))
            : null}
        </div>
      </div>
    );
  };

  if (isLoading) return <Skeleton className="h-32 w-full" />;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-neutral-900 dark:text-white">
        <MessageCircle className="h-4 w-4" /> Comments
      </h2>
      <div className="flex flex-col gap-2">
        <MentionInput
          value={topDraft}
          onChange={setTopDraft}
          rows={2}
          placeholder="Add a comment..."
          maxLength={500}
        />
        <div className="flex justify-end">
          <Button
            isLoading={addingTop}
            disabled={!topDraft.trim()}
            onClick={() => addTop()}
          >
            Comment
          </Button>
        </div>
      </div>
      {(data?.data.length ?? 0) === 0 ? (
        <EmptyState
          title="No comments yet"
          description="Be the first to share your thoughts."
        />
      ) : (
        <div className="flex flex-col gap-4">
          {(data?.data ?? []).map((c) => renderComment(c))}
        </div>
      )}
    </div>
  );
}
