import { createTestApp } from "./helpers/create-test-app";
import { makeUserRow, TEST_USER_ID } from "./helpers/fixtures";
import type { INestApplication } from "@nestjs/common";
import type { PrismaServiceMock } from "./helpers/create-prisma-mock";

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

const MISSING_ID = "99999999-9999-4999-8999-999999999999";

describe("Users (integration)", () => {
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

  describe("GET /users", () => {
    it("lists users with the pagination envelope", async () => {
      prisma.client.user.findMany.mockResolvedValue([makeUserRow()]);
      prisma.client.user.count.mockResolvedValue(1);

      const res = await request.get("/users?skip=0&take=10").expect(200);

      expect(res.body).toMatchObject({ total: 1, skip: 0, take: 10 });
      expect(res.body.data).toHaveLength(1);
      expect(prisma.client.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 }),
      );
    });
  });

  describe("GET /users/search", () => {
    it("searches non-deleted users by name (case-insensitive)", async () => {
      prisma.client.user.findMany.mockResolvedValue([makeUserRow()]);
      prisma.client.user.count.mockResolvedValue(1);

      const res = await request.get("/users/search?q=test").expect(200);

      expect(res.body.total).toBe(1);
      expect(prisma.client.user.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deleted: false,
            OR: [
              { userName: { contains: "test", mode: "insensitive" } },
              { displayName: { contains: "test", mode: "insensitive" } },
            ],
          }),
        }),
      );
    });

    it("requires the q parameter (400)", async () => {
      await request.get("/users/search").expect(400);
    });
  });

  describe("GET /users/:id", () => {
    it("returns a user with counters (200)", async () => {
      prisma.client.user.findUnique.mockResolvedValue({
        ...makeUserRow({ id: TEST_USER_ID }),
        _count: { createdPosts: 0, followers: 1, following: 2, comments: 3 },
      });

      const res = await request.get(`/users/${TEST_USER_ID}`).expect(200);

      expect(res.body.id).toBe(TEST_USER_ID);
      expect(prisma.client.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_USER_ID },
          select: expect.objectContaining({
            _count: expect.objectContaining({ select: expect.anything() }),
          }),
        }),
      );
    });

    it("returns 404 for a deleted user", async () => {
      prisma.client.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        deleted: true,
      });
      await request.get(`/users/${TEST_USER_ID}`).expect(404);
    });
  });

  describe("GET /users/:id/followers and /following", () => {
    it("lists a user's followers (200)", async () => {
      prisma.client.user.findUnique.mockResolvedValue({ id: TEST_USER_ID });
      prisma.client.users_Follows.findMany.mockResolvedValue([
        { follower: makeUserRow() },
      ]);
      prisma.client.users_Follows.count.mockResolvedValue(1);

      const res = await request
        .get(`/users/${TEST_USER_ID}/followers`)
        .expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.data).toHaveLength(1);
      expect(prisma.client.users_Follows.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ followingId: TEST_USER_ID }),
        }),
      );
    });

    it("returns 404 for an unknown user", async () => {
      prisma.client.user.findUnique.mockResolvedValue(null);
      await request.get(`/users/${MISSING_ID}/followers`).expect(404);
    });

    it("lists a user's following (200)", async () => {
      prisma.client.user.findUnique.mockResolvedValue({ id: TEST_USER_ID });
      prisma.client.users_Follows.findMany.mockResolvedValue([
        { following: makeUserRow() },
      ]);
      prisma.client.users_Follows.count.mockResolvedValue(1);

      const res = await request
        .get(`/users/${TEST_USER_ID}/following`)
        .expect(200);

      expect(res.body.total).toBe(1);
      expect(prisma.client.users_Follows.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ followerId: TEST_USER_ID }),
        }),
      );
    });
  });

  describe("PATCH /users/:id", () => {
    it("updates the authenticated user regardless of the path id", async () => {
      prisma.client.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        deleted: false,
      });
      prisma.client.user.update.mockResolvedValue({
        id: TEST_USER_ID,
        displayName: "Renamed",
      });

      const res = await request
        .patch(`/users/${MISSING_ID}`)
        .send({ displayName: "Renamed" })
        .expect(200);

      expect(res.body.displayName).toBe("Renamed");
      expect(prisma.client.user.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: TEST_USER_ID } }),
      );
    });

    it("returns 404 when the user is deleted", async () => {
      prisma.client.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        deleted: true,
      });
      await request
        .patch(`/users/${MISSING_ID}`)
        .send({ displayName: "x" })
        .expect(404);
    });
  });

  describe("DELETE /users/:id", () => {
    it("soft-deletes the authenticated user (200)", async () => {
      prisma.client.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        deleted: false,
      });
      prisma.client.user.update.mockResolvedValue({
        id: TEST_USER_ID,
        deleted: true,
      });

      const res = await request.delete(`/users/${TEST_USER_ID}`).expect(200);

      expect(prisma.client.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_USER_ID },
          data: expect.objectContaining({ deleted: true }),
        }),
      );
    });

    it("returns 404 when already deleted", async () => {
      prisma.client.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        deleted: true,
      });
      await request.delete(`/users/${TEST_USER_ID}`).expect(404);
    });
  });
});
