"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  getPost,
  getPostLikes,
  toPostCardModel,
  type PostCardModel,
} from "@/lib/posts";
import { PostCard } from "@/components/posts/post-card";
import { CommentsSection } from "@/components/posts/comments";
import { Skeleton } from "@/components/ui-kit/skeleton";
import { useAuth } from "@/contexts/auth-context";

export default function PostDetailPage() {
  const params = useParams<{ id: string }>();
  const postId = params.id;
  const { user } = useAuth();

  const { data: post, isLoading } = useQuery({
    queryKey: ["post", postId],
    queryFn: () => getPost(postId),
  });

  const { data: likes } = useQuery({
    queryKey: ["postLikes", postId],
    queryFn: () => getPostLikes(postId),
  });

  if (isLoading || !post) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col gap-4">
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const model: PostCardModel = {
    ...toPostCardModel(post),
    likedByMe: likes?.data.some((l) => l.id === user?.userId) ?? false,
    _count: { postLikes: likes?.total ?? 0, comments: 0 },
  };

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4">
      <Link
        href="/"
        className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to feed
      </Link>
      <PostCard post={model} queryKey={["post", postId]} />
      <CommentsSection postId={postId} />
    </div>
  );
}
