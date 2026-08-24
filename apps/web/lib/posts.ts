import { api } from "@/lib/api-client";

export interface FeedAuthor {
  id: string;
  userName: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface FeedAsset {
  id: string;
  filePath: string;
  thumbnailPath: string | null;
  mediumPath: string | null;
  fileType: string;
  width: number | null;
  height: number | null;
}

export interface FeedPostAsset {
  orderIndex: number;
  asset: FeedAsset;
}

export interface FeedPost {
  id: string;
  content: string;
  visibility: string;
  createdAt: string;
  userId: string;
  creator: FeedAuthor;
  postsAssets: FeedPostAsset[];
  _count: { postLikes: number; comments: number };
  postLikes: { id: string }[];
}

export interface FeedResponse {
  data: FeedPost[];
  total: number;
  nextCursor: string | null;
  hasMore: boolean;
}

export interface SearchPost {
  id: string;
  userId: string;
  content: string;
  visibility: string;
  createdAt: string;
  creator: FeedAuthor;
  postsAssets: FeedPostAsset[];
}

export interface SearchResponse {
  data: SearchPost[];
  total: number;
  skip: number;
  take: number;
}

export interface PostDetail {
  id: string;
  userId: string;
  content: string;
  visibility: string;
  archived: boolean;
  createdAt: string;
  updatedAt: string;
  postsAssets: FeedPostAsset[];
}

export interface LikedUser {
  id: string;
  userName: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface LikesResponse {
  data: LikedUser[];
  total: number;
}

export interface CommentUser {
  id: string;
  userName: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface CommentItem {
  id: string;
  postId: string;
  userId: string;
  parentCommentId: string | null;
  content: string;
  createdAt: string;
  updatedAt: string;
  user: CommentUser;
  childComments: CommentItem[];
  _count?: { commentLikes: number };
}

export interface CommentsResponse {
  data: CommentItem[];
  total: number;
  skip: number;
  take: number;
}

export interface UploadedAsset {
  id: string;
  fileType: string;
  fileSize: number;
  width: number | null;
  height: number | null;
  url: string;
}

export interface PostCardModel {
  id: string;
  content: string;
  visibility: string;
  createdAt: string;
  userId: string;
  creator: FeedAuthor | null;
  postsAssets: FeedPostAsset[];
  _count?: { postLikes: number; comments: number };
  likedByMe?: boolean;
}

export function toPostCardModel(
  post: FeedPost | SearchPost | PostDetail,
): PostCardModel {
  return {
    id: post.id,
    content: post.content,
    visibility: post.visibility,
    createdAt: post.createdAt,
    userId: post.userId,
    creator: "creator" in post ? post.creator : null,
    postsAssets: post.postsAssets,
    ...("_count" in post ? { _count: post._count } : {}),
    ...("postLikes" in post ? { likedByMe: post.postLikes.length > 0 } : {}),
  };
}

export function getFeed(
  cursor: string | null,
  take = 20,
): Promise<FeedResponse> {
  if (!cursor) return api.get<FeedResponse>("/feed", { take: String(take) });
  return api.get<FeedResponse>("/feed", { cursor, take: String(take) });
}

export function createPost(dto: {
  content: string;
  visibility: string;
  assetIds?: string[];
}): Promise<PostDetail> {
  return api.post<PostDetail>("/posts", dto);
}

export function updatePost(
  id: string,
  dto: { content?: string; visibility?: string },
): Promise<PostDetail> {
  return api.patch<PostDetail>(`/posts/${id}`, dto);
}

export function deletePost(id: string): Promise<void> {
  return api.delete<void>(`/posts/${id}`);
}

export function getPost(id: string): Promise<PostDetail> {
  return api.get<PostDetail>(`/posts/${id}`);
}

export function searchPosts(
  q: string,
  skip = 0,
  take = 20,
): Promise<SearchResponse> {
  const params = { q, skip: String(skip), take: String(take) };
  return api.get<SearchResponse>("/posts/search", params);
}

export function togglePostLike(
  postId: string,
): Promise<{ action: "liked" | "unliked" }> {
  return api.post<{ action: "liked" | "unliked" }>(`/posts/${postId}/likes`);
}

export function getPostLikes(postId: string): Promise<LikesResponse> {
  return api.get<LikesResponse>(`/posts/${postId}/likes`);
}

export function uploadAssets(
  files: File[],
  visibility: string,
): Promise<UploadedAsset[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append("files", file);
  }
  formData.append("visibility", visibility);
  return api.upload<UploadedAsset[]>("/assets/upload/multiple", formData);
}

export function getComments(
  postId: string,
  skip = 0,
  take = 50,
): Promise<CommentsResponse> {
  const params = { skip: String(skip), take: String(take) };
  return api.get<CommentsResponse>(`/posts/${postId}/comments`, params);
}

export function createComment(
  postId: string,
  dto: { content: string; parentCommentId?: string },
): Promise<CommentItem> {
  return api.post<CommentItem>(`/posts/${postId}/comments`, dto);
}

export function updateComment(
  id: string,
  content: string,
): Promise<CommentItem> {
  return api.patch<CommentItem>(`/comments/${id}`, { content });
}

export function deleteComment(id: string): Promise<void> {
  return api.delete<void>(`/comments/${id}`);
}

export function toggleCommentLike(
  id: string,
): Promise<{ action: "liked" | "unliked" }> {
  return api.post<{ action: "liked" | "unliked" }>(`/comments/${id}/like`);
}
