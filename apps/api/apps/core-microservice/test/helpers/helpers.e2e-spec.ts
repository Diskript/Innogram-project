import { createPrismaMock } from "./create-prisma-mock";
import {
  makeAssetRow,
  makeCommentRow,
  makePostRow,
  makeUserRow,
  OTHER_USER_A_ID,
  TEST_USER_ID,
} from "./fixtures";
import { createTestApp, TEST_USER } from "./create-test-app";
import { PrismaService } from "../../src/prisma/prisma.service";

describe("integration test helpers", () => {
  it("boots the app with mocked prisma and stubbed auth", async () => {
    const { app, request, prisma } = await createTestApp();

    prisma.client.post.create.mockResolvedValue(makePostRow());
    prisma.client.user.findMany.mockResolvedValue([]);

    const res = await request
      .post("/posts")
      .send({ content: "helper smoke" })
      .expect(201);

    expect(res.body.id).toBe("44444444-4444-4444-8444-444444444444");
    expect(TEST_USER.userId).toBe(TEST_USER_ID);
    expect(prisma).toBeDefined();
    await app.close();
  });

  it("mock exposes every delegate used by the services", () => {
    const prisma = createPrismaMock() as unknown as {
      client: Record<string, Record<string, jest.Mock>>;
    };
    for (const model of [
      "user",
      "post",
      "comment",
      "postLike",
      "commentLike",
      "notification",
      "asset",
      "posts_Assets",
      "conversation",
      "conversation_Participant",
      "message",
      "message_Assets",
      "users_Follows",
      "notificationPreference",
    ]) {
      expect(prisma.client[model]).toBeDefined();
      expect(typeof prisma.client[model].findMany).toBe("function");
      expect(typeof prisma.client[model].create).toBe("function");
    }
    expect(makeUserRow().id).toBe(OTHER_USER_A_ID);
    expect(makeCommentRow().postId).toBe(
      "44444444-4444-4444-8444-444444444444",
    );
    expect(makeAssetRow().fileType).toBe("image/png");
    expect(PrismaService).toBeDefined();
  });
});
