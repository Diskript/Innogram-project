// Export Prisma client for use across the monorepo
import { PrismaClient } from "../generated/prisma/client.js";
import { PrismaPg } from "@prisma/adapter-pg";

// Get database URL from environment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Create Prisma adapter with connection string
const adapter = new PrismaPg({ connectionString: databaseUrl });

// Create a singleton instance of PrismaClient with adapter
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

// In development, preserve the Prisma client across hot reloads
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export * from "../generated/prisma/client.js";
export * from "../generated/prisma/enums.js";
export * from "../generated/prisma/models.js";
export default prisma;
