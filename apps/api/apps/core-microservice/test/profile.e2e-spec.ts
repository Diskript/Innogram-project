import { createTestApp } from "./helpers/create-test-app";
import { makeUserRow, OTHER_USER_A_ID, TEST_USER_ID } from "./helpers/fixtures";
import type { INestApplication } from "@nestjs/common";
import type { PrismaServiceMock } from "./helpers/create-prisma-mock";

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

const TARGET_ID = "88888888-8888-4888-8888-888888888888";
const MISSING_ID = "99999999-9999-4999-8999-999999999999";

describe("Profile & Followings (integration)", () => {
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

  describe("GET /profile", () => {
    it("returns the own profile with counters (200)", async () => {
      prisma.client.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        role: "USER",
        disabled: false,
        deleted: false,
        userName: "testuser",
        displayName: "Test User",
        _count: { createdPosts: 1, followers: 2, following: 3, comments: 4 },
      });

      const res = await request.get("/profile").expect(200);

      expect(res.body.id).toBe(TEST_USER_ID);
      expect(res.body._count.followers).toBe(2);
      expect(prisma.client.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: TEST_USER_ID } }),
      );
    });

    it("returns 404 when the profile is deleted", async () => {
      prisma.client.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        deleted: true,
      });

      await request.get("/profile").expect(404);
    });
  });

  describe("PATCH /profile", () => {
    it("updates the own profile (200)", async () => {
      prisma.client.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        deleted: false,
      });
      prisma.client.user.update.mockResolvedValue({
        id: TEST_USER_ID,
        userName: "testuser",
        displayName: "Renamed",
        bio: "new bio",
        avatarUrl: "",
        isPublic: true,
        birthday: null,
      });

      const res = await request
        .patch("/profile")
        .send({ displayName: "Renamed", bio: "new bio" })
        .expect(200);

      expect(res.body.displayName).toBe("Renamed");
      expect(prisma.client.user.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: TEST_USER_ID },
          data: expect.objectContaining({
            displayName: "Renamed",
            bio: "new bio",
          }),
        }),
      );
    });

    it("returns 404 when the profile is deleted", async () => {
      prisma.client.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        deleted: true,
      });

      await request.patch("/profile").send({ bio: "x" }).expect(404);
      expect(prisma.client.user.update).not.toHaveBeenCalled();
    });
  });

  describe("GET /profile/:username", () => {
    it("returns the public profile by username (200)", async () => {
      prisma.client.user.findUnique.mockResolvedValue(
        makeUserRow({
          _count: { createdPosts: 1, followers: 2, following: 3 },
        }),
      );

      const res = await request.get("/profile/other_user_a").expect(200);

      expect(res.body.userName).toBe("other_user_a");
      expect(prisma.client.user.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userName: "other_user_a" },
        }),
      );
    });

    it("returns 404 for an unknown username", async () => {
      prisma.client.user.findUnique.mockResolvedValue(null);
      await request.get("/profile/ghost").expect(404);
    });
  });

  describe("GET /followings", () => {
    it("maps follows to the followed users (200)", async () => {
      prisma.client.users_Follows.findMany.mockResolvedValue([
        { following: makeUserRow({ id: TARGET_ID }) },
      ]);

      const res = await request.get("/followings").expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(TARGET_ID);
      expect(prisma.client.users_Follows.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            followerId: TEST_USER_ID,
            status: "ACCEPTED",
          },
        }),
      );
    });

    it("returns an empty body when nothing is followed", async () => {
      prisma.client.users_Follows.findMany.mockResolvedValue([]);
      const res = await request.get("/followings").expect(200);
      // Nest serializes the service's null return to an empty JSON body
      expect(res.body).toEqual({});
    });
  });

  describe("GET /followings/followers", () => {
    it("maps follows to the follower users (200)", async () => {
      prisma.client.users_Follows.findMany.mockResolvedValue([
        { follower: makeUserRow({ id: OTHER_USER_A_ID }) },
      ]);

      const res = await request.get("/followings/followers").expect(200);

      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(OTHER_USER_A_ID);
    });
  });

  describe("POST /followings/follow/:id", () => {
    it("follows a public user with ACCEPTED status", async () => {
      prisma.client.user.findUnique.mockResolvedValue({
        id: TARGET_ID,
        isPublic: true,
      });
      prisma.client.users_Follows.findUnique.mockResolvedValue(null);
      prisma.client.users_Follows.create.mockResolvedValue({ id: "f-1" });
      prisma.client.notification.create.mockResolvedValue({ id: "n-1" });

      const res = await request
        .post(`/followings/follow/${TARGET_ID}`)
        .expect(201);

      expect(res.body).toEqual({ action: "followed" });
      expect(prisma.client.users_Follows.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            followerId: TEST_USER_ID,
            followingId: TARGET_ID,
            status: "ACCEPTED",
          }),
        }),
      );
    });

    it("requests to follow a private user with PENDING status", async () => {
      prisma.client.user.findUnique.mockResolvedValue({
        id: TARGET_ID,
        isPublic: false,
      });
      prisma.client.users_Follows.findUnique.mockResolvedValue(null);
      prisma.client.users_Follows.create.mockResolvedValue({ id: "f-2" });

      const res = await request
        .post(`/followings/follow/${TARGET_ID}`)
        .expect(201);

      expect(res.body).toEqual({ action: "requested" });
      expect(prisma.client.users_Follows.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: "PENDING" }),
        }),
      );
      expect(prisma.client.notification.create).not.toHaveBeenCalled();
    });

    it("unfollows when a follow already exists", async () => {
      prisma.client.user.findUnique.mockResolvedValue({
        id: TARGET_ID,
        isPublic: true,
      });
      prisma.client.users_Follows.findUnique.mockResolvedValue({ id: "f-3" });

      const res = await request
        .post(`/followings/follow/${TARGET_ID}`)
        .expect(201);

      expect(res.body).toEqual({ action: "unfollowed" });
      expect(prisma.client.users_Follows.delete).toHaveBeenCalledWith({
        where: { id: "f-3" },
      });
    });

    it("returns 400 for an unknown target user", async () => {
      prisma.client.user.findUnique.mockResolvedValue(null);
      await request.post(`/followings/follow/${MISSING_ID}`).expect(400);
    });

    it("returns 400 when following yourself", async () => {
      prisma.client.user.findUnique.mockResolvedValue({
        id: TEST_USER_ID,
        isPublic: true,
      });
      await request.post(`/followings/follow/${TEST_USER_ID}`).expect(400);
    });
  });

  describe("POST /followings/requests/:userId/accept", () => {
    it("accepts a pending request (201)", async () => {
      prisma.client.users_Follows.findUnique.mockResolvedValue({
        id: "f-4",
        status: "PENDING",
      });
      prisma.client.users_Follows.update.mockResolvedValue({
        id: "f-4",
        status: "ACCEPTED",
      });
      prisma.client.notificationPreference.findUnique.mockResolvedValue(null);
      prisma.client.notification.create.mockResolvedValue({
        id: "n-1",
      });

      const res = await request
        .post(`/followings/requests/${OTHER_USER_A_ID}/accept`)
        .expect(201);

      expect(res.body).toEqual({ action: "accepted" });
      expect(prisma.client.users_Follows.update).toHaveBeenCalledWith({
        where: { id: "f-4" },
        data: { status: "ACCEPTED" },
      });
      expect(prisma.client.notification.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            userId: OTHER_USER_A_ID,
            actorId: TEST_USER_ID,
            type: "FOLLOW",
          }),
        }),
      );
    });

    it("returns 400 when there is no pending request", async () => {
      prisma.client.users_Follows.findUnique.mockResolvedValue(null);
      await request
        .post(`/followings/requests/${MISSING_ID}/accept`)
        .expect(400);
    });
  });

  describe("POST /followings/requests/:userId/reject", () => {
    it("rejects a pending request (201)", async () => {
      prisma.client.users_Follows.findUnique.mockResolvedValue({
        id: "f-5",
        status: "PENDING",
      });

      const res = await request
        .post(`/followings/requests/${OTHER_USER_A_ID}/reject`)
        .expect(201);

      expect(res.body).toEqual({ action: "rejected" });
      expect(prisma.client.users_Follows.delete).toHaveBeenCalledWith({
        where: { id: "f-5" },
      });
    });

    it("returns 400 for a non-pending request", async () => {
      prisma.client.users_Follows.findUnique.mockResolvedValue({
        id: "f-6",
        status: "ACCEPTED",
      });
      await request
        .post(`/followings/requests/${OTHER_USER_A_ID}/reject`)
        .expect(400);
    });
  });

  describe("GET /followings/requests/incoming", () => {
    it("lists pending requesters (200)", async () => {
      prisma.client.users_Follows.findMany.mockResolvedValue([
        { follower: makeUserRow() },
      ]);
      const res = await request
        .get("/followings/requests/incoming")
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(prisma.client.users_Follows.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { followingId: TEST_USER_ID, status: "PENDING" },
        }),
      );
    });
  });

  describe("GET /followings/requests/outgoing", () => {
    it("lists sent pending requests (200)", async () => {
      prisma.client.users_Follows.findMany.mockResolvedValue([
        { following: makeUserRow({ id: TARGET_ID }) },
      ]);
      const res = await request
        .get("/followings/requests/outgoing")
        .expect(200);
      expect(res.body).toHaveLength(1);
      expect(res.body[0].id).toBe(TARGET_ID);
    });
  });

  describe("GET /followings/check/:id", () => {
    it("maps PENDING status to pending", async () => {
      prisma.client.users_Follows.findUnique.mockResolvedValue({
        status: "PENDING",
      });
      const res = await request
        .get(`/followings/check/${TARGET_ID}`)
        .expect(200);
      expect(res.body).toEqual({ status: "pending" });
    });

    it("returns self without touching the database", async () => {
      const res = await request
        .get(`/followings/check/${TEST_USER_ID}`)
        .expect(200);
      expect(res.body).toEqual({ status: "self" });
      expect(prisma.client.users_Follows.findUnique).not.toHaveBeenCalled();
    });

    it("returns none without a follow row", async () => {
      prisma.client.users_Follows.findUnique.mockResolvedValue(null);
      const res = await request
        .get(`/followings/check/${TARGET_ID}`)
        .expect(200);
      expect(res.body).toEqual({ status: "none" });
    });
  });
});
