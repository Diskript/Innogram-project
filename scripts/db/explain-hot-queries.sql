-- EXPLAIN (ANALYZE, BUFFERS) audit of the hot query paths.
-- Run after seeding volume data (scripts/db/seed-volume.sql):
--   docker exec -i innogram-postgres psql -U innogram_user -d innogram < scripts/db/explain-hot-queries.sql
-- The parameter values stand in for JWT-bound user ids; swap them for a
-- real row id when rerunning against other datasets.
-- NOTE: Prisma 7 uses camelCase column identifiers — always double-quote.

\timing on
ANALYZE posts, users, comments, messages, conversation_participants, users_follows, notifications;

-- Q1a. Feed — non-followed condition only (public posts from public users).
-- Source: feed.service generateFeed (empty following list).
EXPLAIN (ANALYZE, BUFFERS)
SELECT p.id, p.content, p.visibility, p."createdAt", p."userId"
FROM posts p
JOIN users u ON u.id = p.created_by
WHERE p.archived = false
  AND p."userId" <> '00000000-0000-0000-0000-000000000000'
  AND p.visibility = 'PUBLIC'::"Visibility"
  AND u."isPublic" = true
ORDER BY p."createdAt" DESC, p.id DESC
LIMIT 21;

-- Q1b. Feed — with a followed-user set (Prisma renders OR of two branches).
EXPLAIN (ANALYZE, BUFFERS)
WITH following AS (
  SELECT array_agg("followingId"::uuid) AS ids
  FROM users_follows
  WHERE "followerId" = '00000000-0000-0000-0000-000000000000'
    AND status = 'ACCEPTED'
)
SELECT p.id, p.content
FROM posts p
JOIN users u ON u.id = p.created_by
WHERE p.archived = false
  AND p."userId" <> '00000000-0000-0000-0000-000000000000'
  AND (
    (p."userId"::uuid IN (SELECT unnest(ids) FROM following)
      AND p.visibility IN ('PUBLIC'::"Visibility", 'FOLLOWERS'::"Visibility"))
    OR (p."userId"::uuid NOT IN (SELECT unnest(ids) FROM following)
      AND p.visibility = 'PUBLIC'::"Visibility"
      AND u."isPublic" = true)
  )
ORDER BY p."createdAt" DESC, p.id DESC
LIMIT 21;

-- Q2. Chat conversation list — participants of the user.
-- Source: chat.service getConversations.
EXPLAIN (ANALYZE, BUFFERS)
SELECT cp.id
FROM conversation_participants cp
WHERE cp."userId" = '00000000-0000-0000-0000-000000000000'
  AND cp."leftAt" IS NULL;

-- Prisma renders the nested last-message include as a batched query:
EXPLAIN (ANALYZE, BUFFERS)
SELECT m.id, m.content, m."createdAt"
FROM messages m
JOIN conversation_participants cp ON cp."conversationId" = m."conversationId"
WHERE cp."userId" = '00000000-0000-0000-0000-000000000000'
  AND cp."leftAt" IS NULL;

-- Q3. Message history for a conversation. Source: chat.service getMessages.
EXPLAIN (ANALYZE, BUFFERS)
SELECT m.id
FROM messages m
WHERE m."conversationId" = (SELECT "conversationId" FROM messages LIMIT 1)
ORDER BY m."createdAt" DESC
LIMIT 50;

-- Q4. Top-level comments of a post. Source: comments.service findByPost.
EXPLAIN (ANALYZE, BUFFERS)
SELECT c.id
FROM comments c
WHERE c."postId" = (SELECT "postId" FROM comments LIMIT 1)
  AND c."parentCommentId" IS NULL
ORDER BY c."createdAt" DESC
LIMIT 10 OFFSET 0;

-- Q5. Public profile lookup by username. Source: profile.service getPublicProfile.
EXPLAIN (ANALYZE, BUFFERS)
SELECT u.id
FROM users u
WHERE u."userName" = 'vol_user_42';

-- Q6. Followings list. Source: followings.service getFollows.
EXPLAIN (ANALYZE, BUFFERS)
SELECT f.id
FROM users_follows f
WHERE f."followerId" = (SELECT id FROM users WHERE "userName" LIKE 'vol_user%' LIMIT 1)
  AND f.status = 'ACCEPTED';

-- Q7. Notifications list. Source: notifications.service findByUser.
EXPLAIN (ANALYZE, BUFFERS)
SELECT n.id
FROM notifications n
WHERE n."userId" = (SELECT id FROM users WHERE "userName" LIKE 'vol_user%' LIMIT 1)
  AND n.read = false
ORDER BY n."createdAt" DESC
LIMIT 10 OFFSET 0;
