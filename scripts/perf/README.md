# Performance smoke tests (autocannon)

`pnpm perf` runs `scripts/perf/feed.perf.mjs` — a 10s, 20-connection load
against the root and feed endpoints of a RUNNING stack. This is a local
gate, not CI (it needs the full stack + a real token).

## Prerequisites

```bash
pnpm docker:up                                    # postgres + redis + rabbitmq
setsid nohup env PORT=3001 pnpm --filter @repo/api-core start \
  > /tmp/core.log 2>&1 < /dev/null &              # core API (main.ts has no global prefix)
# seed a volume if you want feed data (see scripts/db/README.md)
```

The feed endpoint is auth-guarded: register/login against the auth
service (port 3002, `POST /jwt-auth/register|login`) and export the
access token:

```bash
curl -s -X POST http://localhost:3002/jwt-auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"...","password":"..."}' | jq -r .accessToken
export PERF_TOKEN=<token>
```

## Env

| Var          | Default                 | Purpose                        |
| ------------ | ----------------------- | ------------------------------ |
| `BASE_URL`   | `http://localhost:3001` | Core API base                  |
| `PERF_TOKEN` | unset                   | Bearer token for guarded paths |

## Thresholds & exit code

- p97.5 latency < **500ms** (autocannon exposes underscore percentiles
  and has no p95 key; p97.5 is used as a stricter proxy for the
  plan's p95 budget)
- 0 socket errors AND 0 non-2xx responses

Violation exits 1 → CI-usable if wired into a scheduled job later.

## Baseline (2026-09-13, local docker, volume-seeded DB, cache-aside ON)

| Target | Connections | Duration | p97.5     | 2xx     | errors |
| ------ | ----------- | -------- | --------- | ------- | ------ |
| root   | 20          | 10s      | 24–30ms   | ~15–19k | 0      |
| feed   | 20          | 10s      | 184–208ms | ~1.5k   | 0      |

Note: the feed numbers are with the 60s cache-aside warm (Task 17);
the DB-layer single-query cost was measured separately in
`scripts/db/README.md` (0.2–0.4ms per page at volume). Reruns within a
TTL window hit Redis, so per-request p97.5 stability across runs is the
expected signature of the cache doing its job.
