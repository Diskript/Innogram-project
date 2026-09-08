# Build stage
FROM node:20-alpine AS builder

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Set working directory
WORKDIR /app

# Copy package files
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ ./patches/
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY apps/web ./apps/web
COPY packages/ui ./packages/ui
COPY packages/shared-types ./packages/shared-types
COPY packages/typescript-config ./packages/typescript-config
COPY packages/eslint-config ./packages/eslint-config

# Public URLs the browser uses (nginx routes / to core and /auth, /jwt-auth to auth on host :3000)
ENV NEXT_PUBLIC_API_URL=http://localhost:3000
ENV NEXT_PUBLIC_AUTH_URL=http://localhost:3000

# Build shared-types first (the web resolves @repo/shared-types from its dist), then the app
RUN pnpm --filter @repo/shared-types build && pnpm --filter @repo/web build

# Production stage
FROM node:20-alpine AS runner

WORKDIR /app

# Install pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy package files for production dependencies
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY patches/ ./patches/
COPY apps/web/package.json ./apps/web/
COPY packages/ui/package.json ./packages/ui/
COPY packages/shared-types/package.json ./packages/shared-types/
COPY packages/typescript-config/package.json ./packages/typescript-config/
COPY packages/eslint-config/package.json ./packages/eslint-config/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy built application
COPY --from=builder /app/apps/web/.next ./apps/web/.next
COPY --from=builder /app/apps/web/public ./apps/web/public
COPY --from=builder /app/packages/ui ./packages/ui
COPY --from=builder /app/packages/shared-types ./packages/shared-types
COPY --from=builder /app/packages/typescript-config ./packages/typescript-config
COPY --from=builder /app/packages/eslint-config ./packages/eslint-config

# Set environment
ENV NODE_ENV=production
ENV PORT=3003

# Next.js project root for `next start`
WORKDIR /app/apps/web

# Expose port
EXPOSE 3003

# Start the application (next is a workspace-local dependency)
CMD ["node", "node_modules/next/dist/bin/next", "start"]