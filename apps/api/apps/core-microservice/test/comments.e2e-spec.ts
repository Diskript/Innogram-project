import { createTestApp } from "./helpers/create-test-app";
import {
  makeCommentRow,
  makePostRow,
  OTHER_USER_A_ID,
  TEST_USER_ID,
} from "./helpers/fixtures";
import type { INestApplication } from "@nestjs/common";
import type { PrismaServiceMock } from "./helpers/create-prisma-mock";

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

const POST_ID = "44444444-4444-7444-8444-444444444444";
const COMMENT_ID = "55555555-5555-4555-8555-555555555555";
const MISSING_ID = "99999999-9999-7999-8999-999999999999";

describe("Comments (integration)", () => {
  let app: INestApplication;
  let request: TestApp["request"];
  let prisma: PrismaServiceMock;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    request = testApp.request;
    prisma = testApp.prisma;
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("POST /posts/:postId/comments", () => {
    it("creates a comment (201)", async () => {
      prisma.client.post.findUnique.mockResolvedValue({
        id: POST_ID,
        userId: TEST_USER_ID,
      });
      prisma.client.comment.create.mockResolvedValue(
        makeCommentRow({ postId: POST_ID, userId: TEST_USER_ID }),
      );

      const res = await request
        .post(`/posts/${POST_ID}/comments`)
        .send({ postId: POST_ID, content: "first!" })
        .expect(201);

      expect(res.body.content).toBe("Nice post");
      expect(prisma.client.comment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            postId: POST_ID,
            userId: TEST_USER_ID,
            content: "first!",
            parentCommentId: null,
          }),
        }),
      );
      // own post → no COMMENT notification
      expect(prisma.client.notification.create).not.toHaveBeenCalled();
    });

    it("notifies the post author when commenting on someone else's post", async () => {
      prisma.client.post.findUnique.mockResolvedValue({
        id: POST_ID,
        userId: OTHER_USER_A_ID,
      });
      prisma.client.comment.create.mockResolvedValue(
        makeCommentRow({ userId: TEST_USER_ID }),
      );
      prisma.client.notification.create.mockResolvedValue({
        id: "n-1",
      });

      await request
        .post(`/posts/${POST_ID}/comments`)
        .send({ postId: POST_ID, content: "hi there" })
        .expect(201);

      expect(prisma.client.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: OTHER_USER_A_ID,
            actorId: TEST_USER_ID,
            type: "COMMENT",
            entityId: POST_ID,
          }),
        }),
      );
    });

    it("returns 404 when the post does not exist", async () => {
      prisma.client.post.findUnique.mockResolvedValue(null);

      await request
        .post(`/posts/${MISSING_ID}/comments`)
        .send({ postId: MISSING_ID, content: "hi" })
        .expect(404);
    });

    it("returns 404 when the parent comment belongs to another post", async () => {
      prisma.client.post.findUnique.mockResolvedValue({
        id: POST_ID,
        userId: TEST_USER_ID,
      });
      prisma.client.comment.findUnique.mockResolvedValue({
        id: "77777777-7777-7777-8777-777777777777",
        postId: OTHER_USER_A_ID,
      });

      await request
        .post(`/posts/${POST_ID}/comments`)
        .send({
          postId: POST_ID,
          content: "reply",
          parentCommentId: "77777777-7777-7777-8777-777777777777",
        })
        .expect(404);
    });

    it("rejects empty content (400)", async () => {
      await request
        .post(`/posts/${POST_ID}/comments`)
        .send({ content: "" })
        .expect(400);
      expect(prisma.client.comment.create).not.toHaveBeenCalled();
    });
  });

  describe("GET /posts/:postId/comments", () => {
    it("returns top-level comments with replies and like counts", async () => {
      prisma.client.comment.findMany.mockResolvedValue([makeCommentRow()]);
      prisma.client.comment.count.mockResolvedValue(1);

      const res = await request
        .get(`/posts/${POST_ID}/comments?skip=0&take=10`)
        .expect(200);

      expect(res.body).toMatchObject({ total: 1, skip: 0, take: 10 });
      expect(res.body.data).toHaveLength(1);
      expect(prisma.client.comment.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { postId: POST_ID, parentCommentId: null },
          orderBy: { createdAt: "desc" },
        }),
      );
    });
  });

  describe("PATCH /comments/:id", () => {
    it("updates an own comment (200)", async () => {
      prisma.client.comment.findUnique.mockResolvedValue(
        makeCommentRow({ userId: TEST_USER_ID }),
      );
      prisma.client.comment.update.mockResolvedValue(
        makeCommentRow({ userId: TEST_USER_ID, content: "edited" }),
      );

      const res = await request
        .patch(`/comments/${COMMENT_ID}`)
        .send({ content: "edited" })
        .expect(200);

      expect(res.body.content).toBe("edited");
    });

    it("forbids editing someone else's comment (403)", async () => {
      prisma.client.comment.findUnique.mockResolvedValue(
        makeCommentRow({ userId: OTHER_USER_A_ID }),
      );

      await request
        .patch(`/comments/${COMMENT_ID}`)
        .send({ content: "hijack" })
        .expect(403);
      expect(prisma.client.comment.update).not.toHaveBeenCalled();
    });
  });

  describe("DELETE /comments/:id", () => {
    it("deletes an own comment (200)", async () => {
      prisma.client.comment.findUnique.mockResolvedValue(
        makeCommentRow({ userId: TEST_USER_ID }),
      );

      const res = await request.delete(`/comments/${COMMENT_ID}`).expect(200);

      expect(res.body).toEqual({ action: "deleted" });
      expect(prisma.client.comment.delete).toHaveBeenCalledWith({
        where: { id: COMMENT_ID },
      });
    });

    it("forbids deleting someone else's comment (403)", async () => {
      prisma.client.comment.findUnique.mockResolvedValue(
        makeCommentRow({ userId: OTHER_USER_A_ID }),
      );

      await request.delete(`/comments/${COMMENT_ID}`).expect(403);
      expect(prisma.client.comment.delete).not.toHaveBeenCalled();
    });
  });

  describe("POST /comments/:id/like", () => {
    it("likes when no existing like (201)", async () => {
      prisma.client.comment.findUnique.mockResolvedValue({ id: COMMENT_ID });
      prisma.client.commentLike.findUnique.mockResolvedValue(null);

      const res = await request
        .post(`/comments/${COMMENT_ID}/like`)
        .expect(201);

      expect(res.body).toEqual({ action: "liked" });
      expect(prisma.client.commentLike.create).toHaveBeenCalledWith({
        data: { commentId: COMMENT_ID, userId: TEST_USER_ID },
      });
    });

    it("unlikes when a like already exists (201)", async () => {
      prisma.client.comment.findUnique.mockResolvedValue({ id: COMMENT_ID });
      prisma.client.commentLike.findUnique.mockResolvedValue({
        id: "like-1",
      });

      const res = await request
        .post(`/comments/${COMMENT_ID}/like`)
        .expect(201);

      expect(res.body).toEqual({ action: "unliked" });
      expect(prisma.client.commentLike.delete).toHaveBeenCalledWith({
        where: { id: "like-1" },
      });
    });

    it("returns 404 when the comment does not exist", async () => {
      prisma.client.comment.findUnique.mockResolvedValue(null);
      await request.post(`/comments/${MISSING_ID}/like`).expect(404);
    });
  });
});
