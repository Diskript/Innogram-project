# Innogram Monorepo

## Quick start

```bash
pnpm install
cp .env.example .env       # edit as needed
pnpm docker:up             # postgres + redis + rabbitmq
pnpm db:migrate
pnpm dev
```

## Structure

```
apps/
  api/                          # NestJS monorepo wrapper (nest-cli.json)
    apps/
      core-microservice/        # @repo/api-core - API gateway (port 3001)
      auth-microservice/        # @repo/api-auth - JWT + Google OAuth (port 3002)
  web/                          # @repo/web - Next.js 16 (port 3000/3003)
packages/
  database/                     # @repo/database - Prisma client singleton
  shared-types/                 # @repo/shared-types - DTOs, decorators, utils
  typescript-config/            # Shared tsconfigs (base / nextjs / react-library)
  eslint-config/                # Shared ESLint configs (nest / next / base)
  ui/                           # @repo/ui - placeholder, mostly empty
nginx/                          # Reverse proxy: /auth/, /jwt-auth/ → auth (3002), / → core (3001)
```

## Commands

| Command                    | Scope                        |
| -------------------------- | ---------------------------- |
| `pnpm dev`                 | All apps (turbo)             |
| `pnpm build`               | All apps                     |
| `pnpm test`                | All apps                     |
| `pnpm lint`                | All apps                     |
| `pnpm validate`            | `lint + test`                |
| `pnpm check-types`         | Type-check all               |
| `pnpm format`              | Prettier all `*.{ts,tsx,md}` |
| `pnpm docker:up` / `:down` | Infra containers             |

**Per-package:** `pnpm --filter @repo/api-core test` or `pnpm --filter @repo/web dev`

**Per-file test (unit):** `pnpm --filter @repo/api-core exec jest -- src/auth/auth.service.spec.ts`

**E2E:** `pnpm --filter @repo/api-core exec jest --config ./test/jest-e2e.json`

## Build quirks

- **tsbuildinfo cache bug:** Incremental builds can silently produce empty `dist/`. Always clean `.tsbuildinfo` after switching branches, pulling, or changing tsconfig. This is automated in prebuild scripts for the API services.
- **Build order matters:** `@repo/shared-types` → `@repo/database` → everything else. Prebuild scripts handle this for API services.
- The root `eslint.config.js` uses the NestJS config (it's the VSCode default, but the web app uses `next` config).
- `@repo/database` build: `prisma generate && tsc`. The Prisma client outputs CJS to `generated/prisma/`.
- `apps/web` uses `"type": "module"` — do NOT set `"type": "module"` on CommonJS packages.

## Prisma

- Schema: `packages/database/prisma/schema.prisma`
- Generated client: `packages/database/generated/prisma/` (CJS format)
- `prisma.config.ts` uses `prisma/config` (new Prisma ORM config API)
- Docker uses `prisma db push --accept-data-loss`; local dev uses `prisma migrate dev`

## Tests

- **Framework:** Jest + ts-jest (API) / `next/jest` + SWC (web)
- **Pattern:** `*.spec.ts` (unit), `*.e2e-spec.ts` (e2e, core only)
- **Unit test root:** `src/` directory, matching source tree
- **Auth microservice** test setup (`test/setup.ts`) sets required env vars automatically.
- **Core microservice** has e2e tests under `test/` with `jest-e2e.json` config. Helpers: `test/helpers/create-test-app.ts` boots the full `CoreMicroserviceModule` with a mocked `PrismaService` (typed `PrismaServiceMock`), stubbed `JwtAuthGuard`/`AmqpService`, and a **no-op RedisService** — specs stay deterministic and never open ioredis connections.
- **Web** tests under `apps/web/test/` (components use `@/test/render-with-providers`, factories in `test/factories.ts`, Radix shims in `test/radix-shims.ts` for jsdom). Components import primitives from `@/components/ui-kit/*` only.
- Run `pnpm test` (turbo) or target a specific package.

## Testing-related tooling

- **Playwright E2E** (`e2e/`, see `e2e/README.md`): `pnpm e2e` runs 9 specs through the real web UI against a locally running stack (core 3001, auth 3002, web dev server auto-started by the root `playwright.config.ts`). CI runs them in a separate non-required workflow (`.github/workflows/e2e.yml`).
- **Perf smoke** (`scripts/perf/`, see `scripts/perf/README.md`): `pnpm perf` = autocannon load test with latency/error gates (requires running stack + `PERF_TOKEN`).
- **DB audit scripts** (`scripts/db/`, see `scripts/db/README.md`): volume seed + `EXPLAIN (ANALYZE, BUFFERS)` harness for the hot query paths.
- **Coverage gates:** web `jest.config.mjs` and API `jest.config.cjs` enforce global thresholds (measured −3%); CI test job (Alpine) fails on regression.

## Caching & performance behavior

- **Cache-aside:** `RedisService` (`src/cache/`) wraps ioredis with a transparent in-memory fallback (per-process Map + TTL) when `REDIS_URL` is unset or Redis is unreachable — nothing may hard-depend on Redis. Feed pages cache under `feed:public:{userId}:{cursor|start}:{take}` (60s TTL — key is **per user** because the payload embeds the requester's like-state); public profiles under `profile:public:{username}` (300s). Invalidation: post create/update/delete → `delByPrefix("feed:public:")`; profile update → del by (possibly new) userName. Likes intentionally do NOT flush the feed cache (60s staleness window is the designed trade-off).
- **Keyset pagination:** comments (`GET /posts/:id/comments`), conversations and messages (`GET /chat/...`) accept `?cursor=<lastId>` and return `nextCursor` (null on the last page); `take: N` fetches N+1 rows to probe. Offset `skip/take` still work when no cursor is passed. Chat conversations paginate on the **participation** id (the findMany root), not the conversation id.
- **Chat unread counts:** computed in ONE `message.groupBy` (per-conversation read cutoffs as OR branches) — do not reintroduce per-conversation `count` loops.
- **Uploads:** multer diskStorage stages files under `UPLOAD_ROOT/staging/original` (the destination callback mkdirs the tree — multer only pre-creates dirs for string destinations); `FileService.saveFile` renames them to the visibility-scoped path (EXDEV fallback). Limits: 10 files/request, 100MB hard cap (413), per-type image 10MB (400 via validateFile), non-image/video → 400 at the multer filter. Thumbnails/medium run in the background (`setImmediate`) after the row is persisted with `processingStatus: PENDING`; processing flips it to READY/FAILED. Web shows a "Processing" badge while PENDING.

## Lint & style

- **Prettier:** double quotes, trailing commas, 100 char max (enforced via ESLint)
- **ESLint:** `max-len: 100`, `no-console` is warn (allows `warn|error|info`), `no-explicit-any` is warn, `prettier/prettier` is error
- VSCode: Prettier as default formatter on save (TS/JS/JSON), Prisma extension for `.prisma`

## CI order (`.github/workflows/ci.yml`)

1. `pnpm install --frozen-lockfile`
2. Clean `packages/*/tsconfig.tsbuildinfo`
3. `pnpm --filter @repo/shared-types build`
4. `pnpm --filter @repo/database build`
5. `pnpm check-types`
6. `pnpm build` (remaining packages)

Lint and typecheck run in parallel; build waits for both.

## Nginx routing

Port 3000 in Docker:

- `/auth/*`, `/jwt-auth/*` → auth-microservice:3002
- Everything else → core-microservice:3001

## Infrastructure

- **PostgreSQL 15** (port 5432), **Redis 7** (6379), **RabbitMQ** (5672 / 15672)
- Docker compose at root for all infra + microservices
- Without Docker: need postgres + redis locally, `.env` points to `localhost`

## Notes

- The notifications consumer microservice (mentioned in README) does not exist yet.
- `@repo/shared-types` depends on `@nestjs/common`, `express`, `bcrypt` (decorators, DTOs, middleware live there).
- Workspace root scripts are proxied through turbo; per-package scripts run directly via `pnpm --filter`.
