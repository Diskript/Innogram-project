export const TEST_USER_ID = "11111111-1111-4111-8111-111111111111";
export const OTHER_USER_A_ID = "22222222-2222-4222-8222-222222222222";
export const OTHER_USER_B_ID = "33333333-3333-4333-8333-333333333333";

export function makeUserRow(overrides: Record<string, unknown> = {}) {
  return {
    id: OTHER_USER_A_ID,
    userName: "other_user_a",
    displayName: "Other User A",
    avatarUrl: "",
    bio: "integration fixture",
    isPublic: true,
    deleted: false,
    ...overrides,
  };
}

export function makePostRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "44444444-4444-4444-8444-444444444444",
    content: "Hello from the integration suite",
    visibility: "PUBLIC",
    archived: false,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    updatedAt: new Date("2026-01-01T00:00:00.000Z"),
    userId: TEST_USER_ID,
    postsAssets: [],
    ...overrides,
  };
}

export function makeCommentRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "55555555-5555-4555-8555-555555555555",
    postId: "44444444-4444-4444-8444-444444444444",
    userId: OTHER_USER_A_ID,
    parentCommentId: null,
    content: "Nice post",
    createdAt: new Date("2026-01-01T00:01:00.000Z"),
    updatedAt: new Date("2026-01-01T00:01:00.000Z"),
    childComments: [],
    ...overrides,
  };
}

export function makeAssetRow(overrides: Record<string, unknown> = {}) {
  return {
    id: "66666666-6666-4666-8666-666666666666",
    fileName: "a.png",
    originalName: "a.png",
    filePath: "uploads/a.png",
    thumbnailPath: null,
    mediumPath: null,
    fileType: "image/png",
    fileSize: 1024,
    orderIndex: 0,
    width: 800,
    height: 600,
    duration: null,
    visibility: "PRIVATE",
    ownerId: TEST_USER_ID,
    ...overrides,
  };
}
