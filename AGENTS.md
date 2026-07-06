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

| Command | Scope |
|---|---|
| `pnpm dev` | All apps (turbo) |
| `pnpm build` | All apps |
| `pnpm test` | All apps |
| `pnpm lint` | All apps |
| `pnpm validate` | `lint + test` |
| `pnpm check-types` | Type-check all |
| `pnpm format` | Prettier all `*.{ts,tsx,md}` |
| `pnpm docker:up` / `:down` | Infra containers |

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

- **Framework:** Jest + ts-jest
- **Pattern:** `*.spec.ts` (unit), `*.e2e-spec.ts` (e2e, core only)
- **Unit test root:** `src/` directory, matching source tree
- **Auth microservice** test setup (`test/setup.ts`) sets required env vars automatically. No e2e tests yet.
- **Core microservice** has e2e tests under `test/` with `jest-e2e.json` config.
- Run `pnpm test` (turbo) or target a specific package.

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
