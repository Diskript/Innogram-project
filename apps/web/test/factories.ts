import type {
  ChatConversation,
  ChatMessage,
  ChatParticipant,
  ChatUser,
} from "@/lib/chat";
import type { CommentItem, PostCardModel } from "@/lib/posts";

export const USER_ID = "11111111-1111-4111-8111-111111111111";
export const OTHER_USER_ID = "22222222-2222-4222-8222-222222222222";

export function makeUser(overrides: Partial<ChatUser> = {}): ChatUser {
  return {
    id: USER_ID,
    userName: "testuser",
    displayName: "Test User",
    avatarUrl: null,
    ...overrides,
  };
}

export function makePost(
  overrides: Partial<PostCardModel> = {},
): PostCardModel {
  return {
    id: "post-1",
    content: "Hello world",
    visibility: "PUBLIC",
    createdAt: "2026-01-01T00:00:00.000Z",
    userId: USER_ID,
    creator: {
      id: USER_ID,
      userName: "testuser",
      displayName: "Test User",
      avatarUrl: null,
    },
    postsAssets: [],
    _count: { postLikes: 0, comments: 0 },
    likedByMe: false,
    ...overrides,
  };
}

export function makeComment(overrides: Partial<CommentItem> = {}): CommentItem {
  return {
    id: "comment-1",
    postId: "post-1",
    userId: OTHER_USER_ID,
    parentCommentId: null,
    content: "Nice post",
    createdAt: "2026-01-01T00:01:00.000Z",
    updatedAt: "2026-01-01T00:01:00.000Z",
    user: {
      id: OTHER_USER_ID,
      userName: "otheruser",
      displayName: "Other User",
      avatarUrl: null,
    },
    childComments: [],
    ...overrides,
  };
}

export function makeParticipant(
  overrides: Partial<ChatParticipant> = {},
): ChatParticipant {
  return {
    id: "participant-1",
    userId: USER_ID,
    role: "MEMBER",
    joinedAt: "2026-01-01T00:00:00.000Z",
    leftAt: null,
    user: makeUser(),
    ...overrides,
  };
}

export function makeMessage(overrides: Partial<ChatMessage> = {}): ChatMessage {
  return {
    id: "message-1",
    conversationId: "conversation-1",
    senderId: USER_ID,
    content: "Hello there",
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    sender: makeUser(),
    assets: [],
    ...overrides,
  };
}

export function makeConversation(
  overrides: Partial<ChatConversation> = {},
): ChatConversation {
  return {
    id: "conversation-1",
    name: null,
    isGroup: false,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    unreadCount: 0,
    participants: [makeParticipant()],
    ...overrides,
  };
}
