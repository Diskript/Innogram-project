import { Test, TestingModule } from "@nestjs/testing";
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { CoreMicroserviceModule } from "../src/core-microservice.module";
import { JwtAuthGuard } from "../src/auth/jwt-auth.guard";
import { PrismaService } from "../src/prisma/prisma.service";

const E2E_USER_ID = "11111111-1111-4111-8111-111111111111";
const OTHER_USER_A = "22222222-2222-4222-8222-222222222222";
const OTHER_USER_B = "33333333-3333-4333-8333-333333333333";

class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = { userId: E2E_USER_ID, email: "e2e-user@test.local" };
    return true;
  }
}

describe("Chat lifecycle (e2e)", () => {
  let app: INestApplication;
  let http: Server;
  let prisma: PrismaService;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [CoreMicroserviceModule],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    http = app.getHttpServer();
    prisma = app.get(PrismaService);

    const seeds = [
      { id: E2E_USER_ID, userName: "e2e_main", displayName: "E2E Main" },
      { id: OTHER_USER_A, userName: "e2e_other_a", displayName: "E2E Other A" },
      { id: OTHER_USER_B, userName: "e2e_other_b", displayName: "E2E Other B" },
    ];
    for (const seed of seeds) {
      await prisma.client.user.upsert({
        where: { id: seed.id },
        update: {},
        create: {
          id: seed.id,
          userName: seed.userName,
          displayName: seed.displayName,
          birthday: new Date("1990-01-01"),
          bio: "e2e seed user",
          avatarUrl: "",
        },
      });
    }
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  it("runs the full conversation lifecycle", async () => {
    const create = await request(http)
      .post("/chat/conversations")
      .send({ participantIds: [OTHER_USER_A] })
      .expect(201);
    const conversationId = create.body.id as string;

    await request(http)
      .post(`/chat/conversations/${conversationId}/messages`)
      .send({ content: "hello world" })
      .expect(201);

    const list = await request(http).get("/chat/conversations").expect(200);
    const listed = list.body.data.find(
      (c: { id: string }) => c.id === conversationId,
    );
    expect(listed.unreadCount).toBe(0);

    await request(http)
      .post(`/chat/conversations/${conversationId}/read`)
      .expect(201);

    const add = await request(http)
      .post(`/chat/conversations/${conversationId}/participants`)
      .send({ userIds: [OTHER_USER_B] })
      .expect(201);
    expect(add.body.participants).toHaveLength(3);

    await request(http)
      .delete(
        `/chat/conversations/${conversationId}/participants/${OTHER_USER_B}`,
      )
      .expect(200);

    await request(http)
      .delete(`/chat/conversations/${conversationId}`)
      .expect(200);
  });

  it("blocks sole-admin self-leave", async () => {
    const create = await request(http)
      .post("/chat/conversations")
      .send({ participantIds: [OTHER_USER_A] })
      .expect(201);
    const conversationId = create.body.id as string;

    await request(http)
      .delete(
        `/chat/conversations/${conversationId}/participants/${E2E_USER_ID}`,
      )
      .expect(403);

    await request(http)
      .delete(`/chat/conversations/${conversationId}`)
      .expect(200);
  });
});
