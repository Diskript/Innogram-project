import {
  Injectable,
  Logger,
  OnModuleInit,
  OnModuleDestroy,
} from "@nestjs/common";
import { prisma } from "@repo/database";
import { retryWithBackoff } from "../common/retry-with-backoff";

export function getPrismaConnectTimeoutMs(): number {
  const raw = process.env.DB_CONNECT_TIMEOUT_MS;
  const parsed = raw ? Number(raw) : NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 60_000;
}

@Injectable()
export class PrismaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    await retryWithBackoff(() => prisma.$connect(), {
      timeoutMs: getPrismaConnectTimeoutMs(),
      onRetry: (attempt, delayMs, error) =>
        this.logger.warn(
          `Database connect failed (attempt ${attempt}), retrying in ${Math.round(delayMs)}ms: ${error.message}`,
        ),
    });
  }

  async onModuleDestroy() {
    await prisma.$disconnect();
  }

  get client() {
    return prisma;
  }
}
