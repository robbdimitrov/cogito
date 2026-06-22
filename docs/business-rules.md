# Business Rules

## User Validation

| Field | Rule |
|---|---|
| name | Required; non-empty after trim |
| username | Required; `[a-zA-Z0-9_]+` only; max 255 chars; stored lowercase |
| email | Required; matches `^[^@]+@[^@]+\.[^@]+$`; stored lowercase |
| password | Min 8, max 1024 characters |
| bio | Optional; no application-enforced length limit |
| profile_photo_key | Optional |
| cover_photo_key | Optional |

`username` and `email` are globally unique (DB constraint). Duplicate returns `already_exists`.

## Credential Updates

- Changing password requires `old_password`; wrong value returns `unauthenticated`.
- On password change, the gateway invalidates all sessions belonging to the user except the current one. Current session is identified by HMAC-SHA256 of the session ID.

## Follow Rules

| Rule | Behavior |
|---|---|
| Self-follow | Rejected — `"Cannot follow yourself."` |
| Duplicate follow | Idempotent — `ON CONFLICT DO NOTHING` |
| Unfollow when not following | Idempotent — silent success |
| Target user does not exist | FK violation → `not_found` |

## Post Types

Posts are mutually exclusive by type. Application enforces reply–quote exclusivity; DB CHECK enforces repost exclusivity.

| Type | Fields set | Additional constraint |
|---|---|---|
| Plain | content | — |
| Reply | content + in_reply_to_id | — |
| Quote | content + quote_of_id | — |
| Repost | repost_of_id | content, quote_of_id, in_reply_to_id must all be NULL |

Reposts resolve to the canonical original: `repost_of_id = COALESCE(source.repost_of_id, source.id)`. Repost chains never exceed one hop. Cannot repost a reply (`WHERE in_reply_to_id IS NULL` enforced before insert).

## Post Content

| Field | Rule |
|---|---|
| content | Max 255 characters (varchar(255)) |
| media_key | Optional; max 255 characters; stored as empty string if absent |
| in_reply_to_id | Cannot be set alongside quote_of_id |
| quote_of_id | Cannot be set alongside in_reply_to_id |

## Feed and Ordering

| Endpoint | Inclusion | Order |
|---|---|---|
| Feed / user timeline | `in_reply_to_id IS NULL`; if repost, original must not be a reply | created DESC, id DESC |
| Liked posts | All post types | likes.created DESC, post.id DESC |
| Replies | `in_reply_to_id = parent_id` | created ASC, id ASC |
| Hashtag posts | Posts in post_hashtags for tag | created DESC, id DESC |

Feed includes all non-reply posts from all users — there is no follow-graph filter in the feed query.

## Post Counters

All counters computed at read time via subqueries on the original post (using `COALESCE(original.id, post.id)`). No stored counter columns.

| Counter | Computed as |
|---|---|
| likes | `COUNT(*) FROM likes WHERE post_id = post.id` |
| reposts | `COUNT(*) FROM posts WHERE repost_of_id = post.id` |
| replies | `COUNT(*) FROM posts WHERE in_reply_to_id = post.id` |
| liked | `EXISTS (SELECT 1 FROM likes WHERE post_id = post.id AND user_id = current_user)` |
| reposted | `EXISTS (SELECT 1 FROM posts WHERE repost_of_id = post.id AND user_id = current_user)` |

Lightweight projections (`GetUsersByIds`, `SearchUsers`) return 0 for all counts and `false` for boolean states.

## Like and Repost Idempotency

| Operation | SQL pattern |
|---|---|
| LikePost | `INSERT … ON CONFLICT DO NOTHING` |
| UnlikePost | `DELETE` — silent if no matching row |
| RepostPost | `INSERT … ON CONFLICT (user_id, repost_of_id) DO NOTHING` |
| RemoveRepost | `DELETE` — silent if no matching row |

## Post Deletion Cascade

| Foreign key | ON DELETE |
|---|---|
| posts.user_id → users.id | CASCADE — all user's posts deleted |
| posts.in_reply_to_id → posts.id | SET NULL — replies become orphaned |
| posts.quote_of_id → posts.id | SET NULL — quotes become orphaned |
| posts.repost_of_id → posts.id | CASCADE — reposts deleted with original |
| likes.post_id → posts.id | CASCADE — likes deleted with post |
| post_hashtags.post_id → posts.id | CASCADE — hashtag associations deleted |

Gateway also calls `ImageService.DeleteImage` when deleting a post with a `mediaKey`.

## Hashtag Rules

| Rule | Value |
|---|---|
| Extraction pattern | `(?:^|[^A-Za-z0-9_])#([A-Za-z0-9_]{1,50})` — must follow non-alphanumeric or start of string |
| When extracted | At post creation from content |
| Storage | Lowercase; deduplicated per post |
| Uniqueness | DB UNIQUE constraint on `hashtags.name` |
| Insert on conflict | `ON CONFLICT (name) DO NOTHING` |
| Tag search | Trigram (GIN index) + ILIKE; ordered by similarity DESC, post_count DESC |
| `GetHashtagPosts` validation | Tag must match `^[A-Za-z0-9_]{1,50}$` |

## Search Indexing

1. User created or profile updated → `INSERT INTO search_outbox(entity_type='user', entity_id)` + `pg_notify('search_outbox', '')`.
2. Post created or deleted → `INSERT INTO search_outbox(entity_type='post', entity_id)` + notify.
3. Each hashtag extracted at post creation → `INSERT INTO search_outbox(entity_type='hashtag', entity_id)` + notify.
4. Worker dequeues `DISTINCT ON (entity_type, entity_id)` rows (LIMIT 100, `FOR UPDATE SKIP LOCKED`).
5. Entity fetched from DB; if present → upsert to Meilisearch; if absent → remove from Meilisearch.
6. On failure: requeue with `attempts + 1`. Give up after 5 attempts.
7. Retry backoff: base 1 s, doubles per retry, max 30 s.
8. Startup backfill: all entities streamed in 500-record batches under advisory lock.

## Image Lifecycle

1. `POST /uploads` — image validated by magic bytes and stored at `staging/{filename}` in S3; `uploads` row created.
2. `POST /posts` with `mediaKey` — gateway calls `VerifyUpload` (ownership check) then `ConsumeUpload` (moves to `{filename}`).
3. `DELETE /posts/{postId}` — gateway calls `DeleteImage` if post had a `mediaKey`.
4. If post creation fails after a successful upload, the staged file is not cleaned up automatically.
