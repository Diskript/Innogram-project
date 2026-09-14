import autocannon from "autocannon";

// Load test for the public feed path. Requires a running stack:
//   pnpm docker:up          (postgres + redis + rabbitmq)
//   PORT=3001 pnpm --filter @repo/api-core start
// Env: BASE_URL (default localhost:3001), PERF_TOKEN (optional bearer
// token — the feed endpoint is auth-guarded).
const BASE_URL = process.env.BASE_URL ?? "http://localhost:3001";
const THRESHOLDS = { p95Millis: 500, errors: 0 };

const headers = {};
if (process.env.PERF_TOKEN) {
  headers.authorization = `Bearer ${process.env.PERF_TOKEN}`;
}

const targets = [
  { name: "root", url: `${BASE_URL}/` },
  { name: "feed", url: `${BASE_URL}/feed?take=20` },
];

let failed = false;
for (const target of targets) {
  const result = await autocannon({
    url: target.url,
    connections: 20,
    duration: 10,
    headers,
  });
  // autocannon exposes underscore percentiles (no p95 key); p97_5 is a stricter proxy
  const p95 = result.latency.p97_5;
  const errors = result.errors + result.non2xx;
  console.log(
    `${target.name}: p95=${p95}ms 2xx=${result["2xx"]} errors=${errors}`,
  );
  if (p95 > THRESHOLDS.p95Millis || errors > THRESHOLDS.errors) failed = true;
}
process.exit(failed ? 1 : 0);
