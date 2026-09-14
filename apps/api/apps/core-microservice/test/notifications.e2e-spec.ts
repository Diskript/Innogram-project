import { createTestApp } from "./helpers/create-test-app";
import type { INestApplication } from "@nestjs/common";
import type { PrismaServiceMock } from "./helpers/create-prisma-mock";

type TestApp = Awaited<ReturnType<typeof createTestApp>>;

const NOTIFICATION_ID = "77777777-7777-7777-8777-777777777777";

describe("Notifications (integration)", () => {
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

  describe("GET /notifications", () => {
    it("lists notifications with the actor projection and envelope", async () => {
      prisma.client.notification.findMany.mockResolvedValue([
        {
          id: NOTIFICATION_ID,
          type: "MENTION",
          read: false,
          actor: { id: "a-1", userName: "actor", displayName: "Actor" },
        },
      ]);
      prisma.client.notification.count.mockResolvedValue(1);

      const res = await request
        .get("/notifications?skip=0&take=10")
        .expect(200);

      expect(res.body.total).toBe(1);
      expect(res.body.data[0].id).toBe(NOTIFICATION_ID);
      expect(prisma.client.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: "11111111-1111-4111-8111-111111111111" },
          orderBy: { createdAt: "desc" },
        }),
      );
    });

    it("filters unread-only when requested", async () => {
      prisma.client.notification.findMany.mockResolvedValue([]);
      prisma.client.notification.count.mockResolvedValue(0);

      await request.get("/notifications?unreadOnly=true").expect(200);

      expect(prisma.client.notification.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ read: false }),
        }),
      );
    });
  });

  describe("PATCH /notifications/:id/read", () => {
    it("marks a notification read (200)", async () => {
      prisma.client.notification.updateMany.mockResolvedValue({ count: 1 });

      const res = await request
        .patch(`/notifications/${NOTIFICATION_ID}/read`)
        .expect(200);

      expect(res.body).toEqual({ success: true });
      expect(prisma.client.notification.updateMany).toHaveBeenCalledWith({
        where: {
          id: NOTIFICATION_ID,
          userId: "11111111-1111-4111-8111-111111111111",
        },
        data: { read: true },
      });
    });

    it("returns 404 when nothing was updated", async () => {
      prisma.client.notification.updateMany.mockResolvedValue({ count: 0 });
      await request.patch(`/notifications/${NOTIFICATION_ID}/read`).expect(404);
    });
  });

  describe("POST /notifications/read-all", () => {
    it("marks all unread notifications read (201)", async () => {
      prisma.client.notification.updateMany.mockResolvedValue({ count: 5 });

      const res = await request.post("/notifications/read-all").expect(201);

      expect(res.body).toEqual({ success: true, updated: 5 });
      expect(prisma.client.notification.updateMany).toHaveBeenCalledWith({
        where: { userId: "11111111-1111-4111-8111-111111111111", read: false },
        data: { read: true },
      });
    });
  });

  describe("GET /notifications/unread-count", () => {
    it("returns the unread count", async () => {
      prisma.client.notification.count.mockResolvedValue(3);

      const res = await request.get("/notifications/unread-count").expect(200);

      expect(res.body).toEqual({ count: 3 });
      expect(prisma.client.notification.count).toHaveBeenCalledWith({
        where: { userId: "11111111-1111-4111-8111-111111111111", read: false },
      });
    });
  });

  describe("GET /notifications/preferences", () => {
    it("returns defaults when no preference row exists", async () => {
      prisma.client.notificationPreference.findUnique.mockResolvedValue(null);

      const res = await request.get("/notifications/preferences").expect(200);

      expect(res.body).toEqual({
        followEnabled: true,
        likeEnabled: true,
        commentEnabled: true,
        mentionEnabled: true,
      });
    });

    it("maps the stored preference row", async () => {
      prisma.client.notificationPreference.findUnique.mockResolvedValue({
        userId: "11111111-1111-4111-8111-111111111111",
        followEnabled: false,
        likeEnabled: true,
        commentEnabled: false,
        mentionEnabled: true,
      });

      const res = await request.get("/notifications/preferences").expect(200);

      expect(res.body).toEqual({
        followEnabled: false,
        likeEnabled: true,
        commentEnabled: false,
        mentionEnabled: true,
      });
    });
  });

  describe("PATCH /notifications/preferences", () => {
    it("upserts the preference row (200)", async () => {
      prisma.client.notificationPreference.upsert.mockResolvedValue({
        userId: "11111111-1111-4111-8111-111111111111",
        followEnabled: false,
        likeEnabled: false,
        commentEnabled: true,
        mentionEnabled: true,
      });

      const res = await request
        .patch("/notifications/preferences")
        .send({ followEnabled: false, likeEnabled: false })
        .expect(200);

      expect(res.body.followEnabled).toBe(false);
      expect(prisma.client.notificationPreference.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({
            userId: "11111111-1111-4111-8111-111111111111",
            followEnabled: false,
            likeEnabled: false,
          }),
          update: { followEnabled: false, likeEnabled: false },
        }),
      );
    });
  });
});
