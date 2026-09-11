import { createTestApp } from "./helpers/create-test-app";
import {
  makeAssetRow,
  makePostRow,
  OTHER_USER_A_ID,
  TEST_USER_ID,
} from "./helpers/fixtures";
import type { INestApplication } from "@nestjs/common";
import type { PrismaServiceMock } from "./helpers/create-prisma-mock";

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

describe("Posts (integration)", () => {
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

  describe("POST /posts", () => {
    it("creates a post and returns it (201)", async () => {
      prisma.client.post.create.mockResolvedValue(makePostRow());
      prisma.client.user.findMany.mockResolvedValue([]);

      const res = await request
        .post("/posts")
        .send({ content: "hello world" })
        .expect(201);

      expect(res.body.id).toBe("44444444-4444-4444-8444-444444444444");
      expect(prisma.client.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: TEST_USER_ID,
            content: "hello world",
            visibility: "PUBLIC",
          }),
        }),
      );
    });

    it("rejects an empty payload (400)", async () => {
      await request.post("/posts").send({}).expect(400);
      expect(prisma.client.post.create).not.toHaveBeenCalled();
    });

    it("rejects invalid visibility (400)", async () => {
      await request
        .post("/posts")
        .send({ content: "hello", visibility: "NOT_A_VALUE" })
        .expect(400);
      expect(prisma.client.post.create).not.toHaveBeenCalled();
    });

    it("nests assets as postsAssets ordered by orderIndex", async () => {
      const asset = makeAssetRow();
      prisma.client.post.create.mockResolvedValue(
        makePostRow({
          postsAssets: [{ orderIndex: 0, asset }],
        }),
      );
      prisma.client.user.findMany.mockResolvedValue([]);

      const res = await request
        .post("/posts")
        .send({
          content: "with media",
          assetIds: ["66666666-6666-4666-8666-666666666666"],
        })
        .expect(201);

      expect(res.body.postsAssets).toHaveLength(1);
      expect(prisma.client.post.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            postsAssets: {
              create: [
                {
                  assetId: "66666666-6666-4666-8666-666666666666",
                  orderIndex: 0,
                },
              ],
            },
          }),
        }),
      );
    });
  });

  describe("GET /posts", () => {
    it("lists posts with pagination envelope", async () => {
      prisma.client.post.findMany.mockResolvedValue([makePostRow()]);
      prisma.client.post.count.mockResolvedValue(1);

      const res = await request.get("/posts?skip=0&take=10").expect(200);

      expect(res.body).toMatchObject({ total: 1, skip: 0, take: 10 });
      expect(res.body.data).toHaveLength(1);
      expect(prisma.client.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });
  });

  describe("GET /posts/search", () => {
    it("searches public posts by content", async () => {
      prisma.client.post.findMany.mockResolvedValue([makePostRow()]);
      prisma.client.post.count.mockResolvedValue(1);

      const res = await request.get("/posts/search?q=hello").expect(200);

      expect(res.body.total).toBe(1);
      expect(prisma.client.post.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            visibility: "PUBLIC",
          }),
        }),
      );
    });

    it("requires the q parameter (400)", async () => {
      await request.get("/posts/search").expect(400);
    });
  });

  describe("GET /posts/:id", () => {
    it("returns a post with nested assets and comments", async () => {
      prisma.client.post.findUnique.mockResolvedValue(makePostRow());

      const res = await request
        .get("/posts/44444444-4444-4444-8444-444444444444")
        .expect(200);

      expect(res.body.id).toBe("44444444-4444-4444-8444-444444444444");
      expect(prisma.client.post.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "44444444-4444-4444-8444-444444444444" },
        }),
      );
    });

    it("returns 404 for a missing post", async () => {
      prisma.client.post.findUnique.mockResolvedValue(null);
      await request
        .get("/posts/99999999-9999-4999-8999-999999999999")
        .expect(404);
    });
  });

  describe("PATCH /posts/:id", () => {
    it("updates an own post (200)", async () => {
      prisma.client.post.findUnique.mockResolvedValue(
        makePostRow({ userId: TEST_USER_ID }),
      );
      prisma.client.post.update.mockResolvedValue(
        makePostRow({ content: "updated" }),
      );

      const res = await request
        .patch("/posts/44444444-4444-4444-8444-444444444444")
        .send({ content: "updated" })
        .expect(200);

      expect(res.body.content).toBe("updated");
      expect(prisma.client.post.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "44444444-4444-4444-8444-444444444444" },
        }),
      );
    });

    it("forbids updating someone else's post (403)", async () => {
      prisma.client.post.findUnique.mockResolvedValue(
        makePostRow({ userId: OTHER_USER_A_ID }),
      );

      await request
        .patch("/posts/44444444-4444-4444-8444-444444444444")
        .send({ content: "hijack" })
        .expect(403);
      expect(prisma.client.post.update).not.toHaveBeenCalled();
    });

    it("returns 404 when the post does not exist", async () => {
      prisma.client.post.findUnique.mockResolvedValue(null);
      await request
        .patch("/posts/99999999-9999-4999-8999-999999999999")
        .send({ content: "updated" })
        .expect(404);
    });
  });

  describe("DELETE /posts/:id", () => {
    it("deletes an own post (200)", async () => {
      prisma.client.post.findUnique.mockResolvedValue(
        makePostRow({ userId: TEST_USER_ID }),
      );
      prisma.client.post.delete.mockResolvedValue(
        makePostRow({ userId: TEST_USER_ID }),
      );

      await request
        .delete("/posts/44444444-4444-4444-8444-444444444444")
        .expect(200);
      expect(prisma.client.post.delete).toHaveBeenCalledWith({
        where: { id: "44444444-4444-4444-8444-444444444444" },
      });
    });

    it("forbids deleting someone else's post (403)", async () => {
      prisma.client.post.findUnique.mockResolvedValue(
        makePostRow({ userId: OTHER_USER_A_ID }),
      );

      await request
        .delete("/posts/44444444-4444-4444-8444-444444444444")
        .expect(403);
      expect(prisma.client.post.delete).not.toHaveBeenCalled();
    });
  });
});
