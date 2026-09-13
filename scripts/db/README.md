# Database query audit — INO-11 (Phase 5)

Date: 2026-09-11 · Environment: local docker postgres (innogram-postgres),
volume-seeded per `seed-volume.sql` (500 users / 5k posts / 10k comments /
20k messages / 500 conversations / 1k participants).

## How to rerun

```bash
docker compose up -d postgres            # local dev DB
docker exec -i innogram-postgres psql -U innogram_user -d innogram \
  < scripts/db/seed-volume.sql           # optional volume (destructive! TRUNCATE first)
docker exec -i innogram-postgres psql -U innogram_user -d innogram \
  < scripts/db/explain-hot-queries.sql
```

## Findings

All plans captured with `EXPLAIN (ANALYZE, BUFFERS)` after `ANALYZE`
(fresh volume data had never been vacuumed — see the stats note below).

| Query (source)                                                  | Plan at volume                                                                                     | Execution    |
| --------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------ |
| Feed, no follows (`feed.service.generateFeed`)                  | `posts_createdAt_idx` backward walk, creator join via PK + memoize, stops at LIMIT rows            | **0.21 ms**  |
| Feed, with follows                                              | same backward walk; the OR (followed/public branches) evaluated as filters on the presorted stream | **0.36 ms**  |
| Chat conversation list (`chat.service.getConversations`)        | `conversation_participants_userId_idx`                                                             | 0.02–0.05 ms |
| Last-message include (batched by Prisma)                        | join via `messages_conversationId_createdAt_idx`                                                   | 0.05 ms      |
| Message history (`getMessages`, take 50)                        | `messages_conversationId_createdAt_idx` backward                                                   | 0.05 ms      |
| Top-level comments (`comments.service.findByPost`)              | `comments_postId_createdAt_idx` backward + `parentCommentId` filter                                | 0.05 ms      |
| Public profile by username (`profile.service.getPublicProfile`) | unique `users_userName_key`                                                                        | 0.03 ms      |
| Followings (`getFollows`)                                       | `[followerId, status]` composite (unique-prefix path)                                              | 0.05 ms      |
| Notifications (`findByUser`)                                    | `notifications_userId_read_idx`                                                                    | 0.06 ms      |

### Conclusion — no index changes

Every hot path is sub-millisecond at 5k+ row volume using **existing**
indexes; the composite candidates from the plan
(`Message [conversationId, createdAt DESC]`, `Notification [userId, read,
createdAt DESC]`, reverse join-table lookups) were all either already
present or not justified by the plans:

- `Message @@index([conversationId, createdAt])` exists; PostgreSQL walks
  it **backward** for `createdAt DESC` — a `sort: Desc` duplicate adds
  nothing.
- `Notification` already has `[userId, read]` and `[userId, createdAt]`;
  the observed plan filters `read` on the index without scans beyond a
  few rows.
- `Posts_Assets`/`Message_Assets` reverse lookups (`assetId`) are indexed
  on both directions.

Nothing was added to `schema.prisma`; migration step skipped
(plan Task 14 anticipated this "no-op outcome" branch).

## Operational note: statistics

The first audit run (right after bulk inserts, before `ANALYZE`) produced
a badly estimated plan for the feed: the planner chose a **bitmap scan on
`posts_archived_visibility_createdAt_idx`** with `rows=12` (estimate) vs
`rows=5006` (actual) and paid a full recheck + sort — ~7 ms instead of
0.2 ms. After `ANALYZE` the planner switched to the backward
`posts_createdAt_idx` walk and never rechecks more rows than LIMIT asks
for.

Implication for production: bulk imports/migrations followed immediately
by feed traffic can run on stale stats until autovacuum/analyze catches
up. Consider `analyze_threshold` tuning or an explicit `ANALYZE` step
after migration-based bulk loads.

## Caveat

`created_by` is nullable and the feed's non-followed branch joins
`posts.created_by → users` with `isPublic` — posts whose `created_by` is
NULL are silently dropped from the feed. Verified in the plan (inner
join). Not a performance issue, but worth knowing when posts are created
by paths that don't stamp `createdBy` (posts.service does stamp it).
