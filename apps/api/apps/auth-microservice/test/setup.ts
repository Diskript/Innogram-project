// Set required environment variables before any imports
process.env.DATABASE_URL =
  process.env.DATABASE_URL || "postgresql://test:test@localhost:5432/test";
process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret";
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "15m";
process.env.JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || "7d";
process.env.CORE_SERVICE_URL =
  process.env.CORE_SERVICE_URL || "http://localhost:3001";
process.env.HASH_SALT = process.env.HASH_SALT || "10";
process.env.REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
