# Playwright E2E tests

Browser-level tests for the main user flows: auth (signup/login), feed
(post creation visible across users), profile (view/follow/settings), chat
(start conversation + send message), and a middleware smoke check.

## Prerequisites

- Node 20 + pnpm
- Docker infra running: `docker compose up -d postgres redis rabbitmq`
- Database schema applied:
  `pnpm --filter @repo/database exec prisma migrate deploy`
  (with `DATABASE_URL` from the root `.env` in scope)
- Core API on **3001** and Auth API on **3002**:

```bash
pnpm --filter @repo/api-core build && PORT=3001 pnpm --filter @repo/api-core start &
pnpm --filter @repo/api-auth build && PORT=3002 pnpm --filter @repo/api-auth start &
```

- The web dev server on **3000** is started automatically by the Playwright
  `webServer` config (set `E2E_BASE_URL` to skip that and use a running one).

## Run

```bash
pnpm e2e              # all specs, serial (workers: 1)
pnpm e2e e2e/chat.spec.ts
pnpm e2e --grep "follow"
```

Traces and screenshots land in `test-results/`; view failures with:

```bash
pnpm exec playwright show-trace test-results/<suite>/trace.zip
```

## Seeding

`e2e/helpers/seed.ts` registers users through the auth API (409 on
re-run is tolerated) and `loginViaUi` performs the real `/login` flow so the
`innogram_session` cookie and localStorage refresh token are set exactly as
in production. Tests are idempotent across runs (e.g. the follow toggle
normalizes to "not following" before following).

## Notes

- Tests run serially (`workers: 1`) — the shared dev stack flakes when
  several browsers hit next dev + websockets in parallel.
- The feed excludes your own posts by design (`userId not: self`), so the
  feed spec verifies cross-user visibility instead.
