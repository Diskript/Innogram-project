// Export Prisma client for use across the monorepo
import { PrismaClient } from "../generated/prisma/client.js";

// Create a singleton instance of PrismaClient
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

// In development, preserve the Prisma client across hot reloads
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "../generated/prisma/client.js";
export * from "../generated/prisma/enums.js";
export * from "../generated/prisma/models.js";
export default prisma;
