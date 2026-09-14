import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "./prisma.service";
import { prisma } from "@repo/database";

jest.mock("@repo/database", () => ({
  prisma: { $connect: jest.fn(), $disconnect: jest.fn() },
}));

describe("PrismaService", () => {
  let service: PrismaService;
  const connectMock = prisma.$connect as jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });
  afterEach(() => jest.useRealTimers());

  it("retries connect until success", async () => {
    connectMock
      .mockRejectedValueOnce(new Error("db down"))
      .mockResolvedValueOnce(undefined);

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();
    service = module.get<PrismaService>(PrismaService);

    const promise = service.onModuleInit();
    await jest.advanceTimersByTimeAsync(0);
    await jest.advanceTimersByTimeAsync(1_000);
    await expect(promise).resolves.toBeUndefined();
    expect(connectMock).toHaveBeenCalledTimes(2);
  });

  it("fails after timeout budget exhausted", async () => {
    connectMock.mockRejectedValue(new Error("db down"));

    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();
    service = module.get<PrismaService>(PrismaService);

    const promise = service.onModuleInit();
    promise.catch(() => undefined);
    await jest.advanceTimersByTimeAsync(70_000);

    await expect(promise).rejects.toThrow("db down");
  });

  it("disconnects on module destroy", async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaService],
    }).compile();
    service = module.get<PrismaService>(PrismaService);

    await service.onModuleDestroy();
    expect(prisma.$disconnect).toHaveBeenCalled();
  });
});
