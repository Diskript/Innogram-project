# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/api/apps/core-microservice/package.json ./apps/api/apps/core-microservice/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/api/apps/core-microservice ./apps/api/apps/core-microservice
COPY packages/database ./packages/database
COPY packages/shared-types ./packages/shared-types
COPY apps/api/nest-cli.json apps/api/tsconfig.json apps/api/tsconfig.build.json ./

# Build the application
RUN pnpm --filter @repo/api-core build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install production dependencies
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files for production dependencies
COPY package.json pnpm-lock.yaml ./
COPY apps/api/apps/core-microservice/package.json ./apps/api/apps/core-microservice/
COPY packages/database/package.json ./packages/database/
COPY packages/shared-types/package.json ./packages/shared-types/

# Install dependencies (including dev for type generation)
RUN pnpm install --frozen-lockfile

# Copy built application
COPY --from=builder /app/apps/api/apps/core-microservice/dist ./apps/api/apps/core-microservice/dist
COPY --from=builder /app/packages/database/prisma ./packages/database/prisma
COPY --from=builder /app/packages/shared-types/dist ./packages/shared-types/dist
COPY --from=builder /app/packages/database/dist ./packages/database/dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/apps/api/apps/core-microservice/node_modules ./apps/api/apps/core-microservice/node_modules
COPY --from=builder /app/packages/database/node_modules ./packages/database/node_modules
COPY --from=builder /app/packages/shared-types/node_modules ./packages/shared-types/node_modules

# Generate Prisma Client
RUN npx prisma generate --schema=./packages/database/prisma/schema.prisma

# Set environment
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Start the application
CMD ["node", "apps/api/apps/core-microservice/dist/main.js"]
