import { Test, TestingModule } from "@nestjs/testing";
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { AppModule } from "../src/app.module";
import { JwtAuthGuard } from "../src/jwt-auth/jwt-auth.guard";
import { PrismaService } from "../src/prisma/prisma.service";
import { hashingFunction, comparePassword } from "@repo/shared-types";

const USER_ID = "11111111-1111-4111-8111-111111111111";
const EMAIL = "auth-e2e@test.local";
const PASSWORD = "correct-horse-battery";
const USERNAME = "auth_e2e_user";

// hashingFunction passes HASH_SALT to bcrypt as a raw salt string — it must
// be a valid bcrypt salt, not a round count (the shared default in
// test/setup.ts is "10", which bcrypt rejects). Generate a proper one before
// any hashing call.
process.env.HASH_SALT =
  process.env.HASH_SALT && process.env.HASH_SALT.startsWith("$2")
    ? process.env.HASH_SALT
    : "$2b$10$abcdefghijklmnopqrstuvwx";

type ClientMock = {
  user: Record<string, jest.Mock>;
  account: Record<string, jest.Mock>;
  $transaction: jest.Mock;
};

function createAuthPrismaMock() {
  const client: ClientMock = {
    user: { findUnique: jest.fn(), create: jest.fn() },
    account: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
    $transaction: jest.fn(async (first: unknown) =>
      typeof first === "function"
        ? (first as (tx: unknown) => unknown)(client)
        : Promise.all(first as Promise<unknown>[]),
    ),
  };
  return { client } as unknown as PrismaService;
}

class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = { userId: USER_ID, email: EMAIL };
    return true;
  }
}

describe("Auth (integration)", () => {
  let app: INestApplication;
  let http: Server;
  let client: ClientMock;

  beforeAll(async () => {
    const rawMock = createAuthPrismaMock();
    client = rawMock.client as unknown as ClientMock;
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(PrismaService)
      .useValue(rawMock)
      .overrideGuard(JwtAuthGuard)
      .useClass(TestJwtAuthGuard)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    http = app.getHttpServer();
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 30000);

  afterEach(() => {
    jest.clearAllMocks();
  });

  const signUpDto = {
    email: EMAIL,
    password: PASSWORD,
    username: USERNAME,
    displayName: "Auth E2E User",
    birthday: "1990-01-01",
  };

  describe("POST /jwt-auth/register", () => {
    it("creates the user and account in a transaction (201)", async () => {
      client.account.findFirst.mockResolvedValue(null);
      client.user.findUnique.mockResolvedValue(null);
      client.user.create.mockResolvedValue({ id: USER_ID });
      client.account.create.mockResolvedValue({ email: EMAIL, id: "acc-1" });

      const res = await request(http)
        .post("/jwt-auth/register")
        .send(signUpDto)
        .expect(201);

      expect(res.body).toMatchObject({
        message: "User registered successfully",
        userId: USER_ID,
        userEmail: EMAIL,
      });
      expect(client.account.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            email: EMAIL,
            provider: "LOCAL",
          }),
        }),
      );
    });

    it("rejects an email that already exists (409)", async () => {
      client.account.findFirst.mockResolvedValue({ id: "acc-1" });

      const res = await request(http)
        .post("/jwt-auth/register")
        .send(signUpDto)
        .expect(409);

      expect(res.body.message).toBe("User with this email already exists");
    });

    it("rejects a taken username (409)", async () => {
      client.account.findFirst.mockResolvedValue(null);
      client.user.findUnique.mockResolvedValue({ id: USER_ID });

      const res = await request(http)
        .post("/jwt-auth/register")
        .send(signUpDto)
        .expect(409);

      expect(res.body.message).toBe("Username is already taken");
    });
  });

  describe("POST /jwt-auth/login + refresh rotation", () => {
    const loginDto = { email: EMAIL, password: PASSWORD };

    it("authenticates correct credentials and issues a working refresh token", async () => {
      const passwordHash = await hashingFunction(PASSWORD);
      client.account.findFirst
        .mockResolvedValueOnce({
          id: "acc-1",
          userId: USER_ID,
          email: EMAIL,
          passwordHash,
        })
        .mockResolvedValueOnce({
          id: "acc-1",
          userId: USER_ID,
          email: EMAIL,
        });

      const login = await request(http)
        .post("/jwt-auth/login")
        .send(loginDto)
        .expect(200);

      expect(login.body.message).toBe("Authenticated successfully");
      expect(login.body.userId).toBe(USER_ID);
      expect(typeof login.body.accessToken).toBe("string");
      expect(typeof login.body.refreshToken).toBe("string");
      expect(await comparePassword(PASSWORD, passwordHash)).toBe(true);
      expect(client.account.update).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: "acc-1" } }),
      );

      const refreshed = await request(http)
        .post("/jwt-auth/refresh")
        .send({ refreshToken: login.body.refreshToken })
        .expect(200);

      expect(refreshed.body.message).toBe("Tokens refreshed successfully");
      expect(typeof refreshed.body.accessToken).toBe("string");
      expect(refreshed.body.refreshToken).not.toBe(login.body.refreshToken);
    });

    it("rejects wrong credentials (401)", async () => {
      const passwordHash = await hashingFunction(PASSWORD);
      client.account.findFirst.mockResolvedValue({
        id: "acc-1",
        userId: USER_ID,
        email: EMAIL,
        passwordHash,
      });

      const res = await request(http)
        .post("/jwt-auth/login")
        .send({ email: EMAIL, password: "wrong-password" })
        .expect(401);

      expect(res.body.message).toBe("Invalid credentials");
    });

    it("rejects an unknown account (409)", async () => {
      client.account.findFirst.mockResolvedValue(null);

      await request(http)
        .post("/jwt-auth/login")
        .send({ email: "ghost@test.local", password: PASSWORD })
        .expect(409);
    });
  });

  describe("POST /jwt-auth/validate", () => {
    it("validates a real signed access token (200)", async () => {
      const passwordHash = await hashingFunction(PASSWORD);
      client.account.findFirst.mockResolvedValue({
        id: "acc-1",
        userId: USER_ID,
        email: EMAIL,
        passwordHash,
      });

      const login = await request(http)
        .post("/jwt-auth/login")
        .send({ email: EMAIL, password: PASSWORD })
        .expect(200);

      const res = await request(http)
        .post("/jwt-auth/validate")
        .send({ token: login.body.accessToken })
        .expect(200);

      expect(res.body.valid).toBe(true);
      expect(res.body.payload.sub).toBe(USER_ID);
    });

    it("rejects a garbage token (200, valid=false)", async () => {
      const res = await request(http)
        .post("/jwt-auth/validate")
        .send({ token: "not-a-jwt" })
        .expect(200);

      expect(res.body.valid).toBe(false);
    });
  });

  describe("POST /jwt-auth/logout", () => {
    it("revokes the refresh token (200)", async () => {
      const res = await request(http)
        .post("/jwt-auth/logout")
        .send()
        .expect(200);

      expect(res.body.message).toBe("Logged out successfully");
    });
  });
});
