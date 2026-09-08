import { api } from "@/lib/api-client";

export type FollowStatus = "none" | "pending" | "following" | "self";

export interface FollowUser {
  id: string;
  userName: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  isPublic: boolean;
}

export interface UserListResponse {
  data: FollowUser[];
  total: number;
  skip: number;
  take: number;
}

export function getFollowStatus(
  userId: string,
): Promise<{ status: FollowStatus }> {
  return api.get<{ status: FollowStatus }>(`/followings/check/${userId}`);
}

export function toggleFollow(
  userId: string,
): Promise<{ action: "followed" | "unfollowed" | "requested" }> {
  return api.post<{ action: "followed" | "unfollowed" | "requested" }>(
    `/followings/follow/${userId}`,
  );
}

export function acceptFollowRequest(
  userId: string,
): Promise<{ action: string }> {
  return api.post<{ action: string }>(`/followings/requests/${userId}/accept`);
}

export function rejectFollowRequest(
  userId: string,
): Promise<{ action: string }> {
  return api.post<{ action: string }>(`/followings/requests/${userId}/reject`);
}

export function getIncomingRequests(): Promise<FollowUser[]> {
  return api.get<FollowUser[]>("/followings/requests/incoming");
}

export function getOutgoingRequests(): Promise<FollowUser[]> {
  return api.get<FollowUser[]>("/followings/requests/outgoing");
}

export function getMyFollowers(): Promise<FollowUser[]> {
  return api.get<FollowUser[]>("/followings/followers");
}

export function getMyFollowing(): Promise<FollowUser[]> {
  return api.get<FollowUser[]>("/followings");
}

export function getUserFollowers(
  userId: string,
  skip = 0,
  take = 20,
): Promise<UserListResponse> {
  const params = { skip: String(skip), take: String(take) };
  return api.get<UserListResponse>(`/users/${userId}/followers`, params);
}

export function getUserFollowing(
  userId: string,
  skip = 0,
  take = 20,
): Promise<UserListResponse> {
  const params = { skip: String(skip), take: String(take) };
  return api.get<UserListResponse>(`/users/${userId}/following`, params);
}

export function searchUsers(
  q: string,
  skip = 0,
  take = 10,
): Promise<UserListResponse> {
  const params = { q, skip: String(skip), take: String(take) };
  return api.get<UserListResponse>("/users/search", params);
}
