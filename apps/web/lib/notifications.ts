import { api } from "@/lib/api-client";

export type NotificationType =
  | "FOLLOW"
  | "LIKE"
  | "COMMENT"
  | "MENTION"
  | (string & {});

export interface NotificationActor {
  id: string;
  userName: string;
  displayName: string;
  avatarUrl: string | null;
}

export interface NotificationItem {
  id: string;
  userId: string;
  actorId: string;
  type: NotificationType;
  entityId: string | null;
  read: boolean;
  createdAt: string;
  actor: NotificationActor;
}

export interface NotificationsResponse {
  data: NotificationItem[];
  total: number;
  skip: number;
  take: number;
}

export interface NotificationPreferences {
  followEnabled: boolean;
  likeEnabled: boolean;
  commentEnabled: boolean;
  mentionEnabled: boolean;
}

export function getNotifications(
  skip = 0,
  take = 20,
): Promise<NotificationsResponse> {
  const params = { skip: String(skip), take: String(take) };
  return api.get<NotificationsResponse>("/notifications", params);
}

export function markNotificationRead(
  id: string,
): Promise<{ success: boolean }> {
  return api.patch<{ success: boolean }>(`/notifications/${id}/read`);
}

export function markAllNotificationsRead(): Promise<{
  success: boolean;
  updated: number;
}> {
  return api.post<{ success: boolean; updated: number }>(
    "/notifications/read-all",
  );
}

export function getUnreadCount(): Promise<{ count: number }> {
  return api.get<{ count: number }>("/notifications/unread-count");
}

export function getNotificationPreferences(): Promise<NotificationPreferences> {
  return api.get<NotificationPreferences>("/notifications/preferences");
}

export function updateNotificationPreferences(
  dto: Partial<NotificationPreferences>,
): Promise<NotificationPreferences> {
  return api.patch<NotificationPreferences>("/notifications/preferences", dto);
}
