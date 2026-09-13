-- Synthetic volume for EXPLAIN (ANALYZE, BUFFERS) audits.
-- Run manually against a LOCAL dev database only:
--   docker exec -i innogram-postgres psql -U innogram_user -d innogram < scripts/db/seed-volume.sql
-- NOT idempotent by design — it appends rows each run. Wipe with:
--   TRUNCATE posts, comments, messages, conversations,
--            conversation_participants, users CASCADE;
-- (this also drops real e2e rows — only for local throwaway data)
-- NOTE: the Prisma 7 schema uses camelCase column identifiers (no blanket
-- @map), so every mixed-case column/enum name must be double-quoted.

-- 1. users (skip collisions with real rows via fixed names)
INSERT INTO users (id, "userName", "displayName", birthday, bio, "avatarUrl", "isPublic", "updatedAt")
SELECT gen_random_uuid()::text,
       'vol_user_' || g,
       'Vol User ' || g,
       '1990-01-01'::date,
       'volume seed',
       '',
       true,
       now()
FROM generate_series(1, 500) g
ON CONFLICT ("userName") DO NOTHING;

-- 2. posts (5k spread over volume users)
INSERT INTO posts (id, "userId", content, visibility, archived, "createdAt", "updatedAt", created_by, updated_by)
SELECT gen_random_uuid()::text,
       u.id,
       'volume post ' || g,
       'PUBLIC'::"Visibility",
       false,
       now() - (g || ' minutes')::interval,
       now(),
       u.id,
       u.id
FROM generate_series(1, 5000) g
CROSS JOIN LATERAL (
  SELECT id FROM users WHERE "userName" LIKE 'vol_user_%' ORDER BY random() LIMIT 1
) u;

-- 3. comments (10k on volume posts)
INSERT INTO comments (id, "postId", "userId", "parentCommentId", content, "createdAt", "updatedAt", created_by, updated_by)
SELECT gen_random_uuid()::text,
       p.id,
       u.id,
       NULL,
       'volume comment ' || g,
       now(),
       now(),
       u.id,
       u.id
FROM generate_series(1, 10000) g
CROSS JOIN LATERAL (
  SELECT id FROM posts
  WHERE "userId" IN (SELECT id FROM users WHERE "userName" LIKE 'vol_user_%')
  ORDER BY random() LIMIT 1
) p
CROSS JOIN LATERAL (
  SELECT id FROM users WHERE "userName" LIKE 'vol_user_%' ORDER BY random() LIMIT 1
) u;

-- 4. conversations + participants
WITH vu AS MATERIALIZED (
  SELECT id FROM users WHERE "userName" LIKE 'vol_user_%'
),
conv AS (
  INSERT INTO conversations (id, "isGroup", "createdAt", "updatedAt")
  SELECT gen_random_uuid()::text, false, now(), now()
  FROM generate_series(1, 500) g
  RETURNING id
),
pairs AS (
  SELECT c.id AS cid, u.id AS uid
  FROM conv c
  CROSS JOIN LATERAL (SELECT id FROM vu ORDER BY random() LIMIT 2) u
)
INSERT INTO conversation_participants (id, "conversationId", "userId", role, "joinedAt")
SELECT gen_random_uuid()::text, cid, uid, 'MEMBER'::"ParticipantRole", now()
FROM pairs;

-- 5. messages
INSERT INTO messages (id, "conversationId", "senderId", content, "createdAt", "updatedAt")
SELECT gen_random_uuid()::text,
       c.id,
       p."userId",
       'volume message ' || g,
       now() - (g || ' seconds')::interval,
       now()
FROM generate_series(1, 20000) g
CROSS JOIN LATERAL (SELECT id FROM conversations ORDER BY random() LIMIT 1) c
CROSS JOIN LATERAL (
  SELECT "userId" FROM conversation_participants
  WHERE "conversationId" = c.id LIMIT 1
) p;
