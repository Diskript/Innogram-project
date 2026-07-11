export const NotificationType = {
  LIKE: "LIKE",
  COMMENT: "COMMENT",
  FOLLOW: "FOLLOW",
  MENTION: "MENTION",
  MESSAGE: "MESSAGE",
} as const;

export type NotificationType =
  (typeof NotificationType)[keyof typeof NotificationType];
