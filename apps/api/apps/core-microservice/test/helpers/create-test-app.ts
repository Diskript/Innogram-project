import { Test, TestingModule } from "@nestjs/testing";
import {
  CanActivate,
  ExecutionContext,
  INestApplication,
} from "@nestjs/common";
import type { Server } from "http";
import request from "supertest";
import { CoreMicroserviceModule } from "../../src/core-microservice.module";
import { configureCoreApp } from "../../src/configure-app";
import { JwtAuthGuard } from "../../src/auth/jwt-auth.guard";
import { PrismaService } from "../../src/prisma/prisma.service";
import { AmqpService } from "../../src/amqp/amqp.service";
import { createPrismaMock, type PrismaServiceMock } from "./create-prisma-mock";
import { TEST_USER_ID } from "./fixtures";

export const TEST_USER = {
  userId: TEST_USER_ID,
  email: "test-user@test.local",
};

class TestJwtAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest();
    req.user = TEST_USER;
    return true;
  }
}

/**
 * Stub covering the AmqpService surface used by publishers and consumers
 * (connect, publish, setupQueue, consume, ack, nack) so the mocked specs
 * never need a live RabbitMQ.
 */
function createAmqpMock() {
  return {
    connect: jest.fn(),
    publish: jest.fn(),
    setupQueue: jest.fn(),
    consume: jest.fn(),
    ack: jest.fn(),
    nack: jest.fn(),
  };
}

/**
 * Boots the full CoreMicroserviceModule with a mocked PrismaService, a
 * stubbed JwtAuthGuard and a stubbed AmqpService (no live RabbitMQ),
 * applies the production app configuration (validation pipes, CORS,
 * cookies) and returns a supertest handle.
 */
export async function createTestApp() {
  const prismaMock: PrismaServiceMock = createPrismaMock();
  const amqpMock = createAmqpMock();
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [CoreMicroserviceModule],
  })
    .overrideProvider(PrismaService)
    .useValue(prismaMock as unknown as PrismaService)
    .overrideProvider(AmqpService)
    .useValue(amqpMock as unknown as AmqpService)
    .overrideGuard(JwtAuthGuard)
    .useClass(TestJwtAuthGuard)
    .compile();

  const app = moduleFixture.createNestApplication();
  configureCoreApp(app);
  await app.init();
  const server: Server = app.getHttpServer();

  return {
    app,
    server,
    request: request(server),
    prisma: prismaMock,
    amqp: amqpMock,
  };
}
