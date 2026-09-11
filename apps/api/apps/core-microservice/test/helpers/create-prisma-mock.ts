import type { PrismaService } from "../../src/prisma/prisma.service";

const DELEGATE_METHODS = [
  "findUnique",
  "findFirst",
  "findMany",
  "create",
  "createMany",
  "update",
  "updateMany",
  "upsert",
  "delete",
  "deleteMany",
  "count",
  "aggregate",
  "groupBy",
] as const;

const MODELS = [
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
] as const;

export type PrismaDelegateMock = Record<
  (typeof DELEGATE_METHODS)[number],
  jest.Mock
>;

export type PrismaClientMock = Record<
  (typeof MODELS)[number],
  PrismaDelegateMock
>;

export type PrismaServiceMock = {
  client: PrismaClientMock;
  $transaction: jest.Mock;
  $queryRaw: jest.Mock;
  $queryRawUnsafe: jest.Mock;
  $executeRaw: jest.Mock;
  $connect: jest.Mock;
  $disconnect: jest.Mock;
  onModuleInit: jest.Mock;
  onModuleDestroy: jest.Mock;
};

/**
 * In-memory Prisma mock shaped like the real client surface the services
 * use: `client.<model>.<method>` delegates plus the transaction/raw entry
 * points. Every delegate method starts as a jest.fn() returning undefined,
 * so an unset mock fails loudly instead of silently passing.
 */
export function createPrismaMock(): PrismaServiceMock {
  const client = Object.fromEntries(
    MODELS.map((model) => [
      model,
      Object.fromEntries(DELEGATE_METHODS.map((method) => [method, jest.fn()])),
    ]),
  ) as PrismaClientMock;

  return {
    client,
    $transaction: jest.fn((...args: unknown[]) => {
      const first = args[0];
      if (typeof first === "function") {
        return (first as (tx: unknown) => unknown)(client);
      }
      return Promise.all(first as Promise<unknown>[]);
    }),
    $queryRaw: jest.fn(),
    $queryRawUnsafe: jest.fn(),
    $executeRaw: jest.fn(),
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    onModuleInit: jest.fn(),
    onModuleDestroy: jest.fn(),
  };
}

export type { PrismaService };
