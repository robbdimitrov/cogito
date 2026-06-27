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

Home feed is a hybrid follow graph query. Regular authors are pushed into the `feed` table for each follower plus the author; authors with `fan_out_disabled = true` are pulled in real time from the posts table for followers. Replies do not fan out. Reposts do fan out and provide a discovery path beyond original follows.

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

## Event Relay and Search Indexing

1. Mutating services insert `outbox(topic, payload)` rows in the same transaction as the domain change.
2. Redpanda Connect reads PostgreSQL CDC for new `outbox` rows and publishes the payload to the row's topic.
3. Topic `entity-changes` carries user, post, and hashtag upsert/delete events for Meilisearch sync, feed fan-out, and media cleanup. User and post upserts include `follower_count` and `fan_out_disabled` as a point-in-time fan-out routing snapshot.
4. Topic `activity` carries like, unlike, repost, unrepost, reply, unreply, follow, and unfollow events for notifications and feed maintenance.
5. Search sync is idempotent: upserts replace Meilisearch documents and deletes remove missing documents. Hashtags with `post_count = 0` are deleted from search.
6. Backfill is a one-shot Redpanda Connect job that emits current users, posts, and hashtags to `entity-changes`.

## Notifications

| Event | Behavior |
|---|---|
| like/repost/reply/follow | Create a notification unless actor and recipient are the same user |
| unlike/unrepost/unreply/unfollow | Delete the matching notification |
| post delete | Delete like, repost, and reply notifications tied to the deleted post |

Notification inserts use the outbox row ID as `external_id`, so replayed messages are discarded by a unique constraint. If a parent post deletion cascades reply rows before a corresponding unreply event is emitted, stale reply notifications are cleaned up only when an entity delete event for that reply is observed.

## Feed Fan-Out

1. New non-reply post/repost from a regular author writes `feed` rows for all followers and the author.
2. If the post event's follower snapshot is at least `FAN_OUT_THRESHOLD`, the author is marked `fan_out_disabled` and future feed reads pull that author's posts directly for followers. During mixed-version rollout only, legacy post events that lack this snapshot are routed from a database snapshot instead of being dropped.
3. Following a regular author backfills the follower's feed with the author's latest 50 non-reply posts.
4. Unfollowing prunes that followee's materialized feed rows for the follower.
5. Post and user deletes rely on database CASCADE to remove feed rows; consumers do not separately delete them.

## Image Lifecycle

1. `POST /uploads` — image validated by magic bytes and stored at `staging/{filename}` in S3; `uploads` row created.
2. `POST /posts` with `mediaKey` — gateway calls `VerifyUpload` (ownership check) then `ConsumeUpload` (moves to `{filename}`).
3. `DELETE /posts/{postId}` — gateway calls `DeleteImage` if post had a `mediaKey`.
4. If post creation fails after a successful upload, the staged file is not cleaned up automatically.
