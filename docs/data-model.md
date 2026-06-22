# Data Model

## Entities

| Entity | Table | Description |
|---|---|---|
| User | `users` | Account with credentials and profile |
| Session | `sessions` | Authenticated login token |
| Post | `posts` | Content item: plain, reply, quote, or repost |
| Like | `likes` | User–post engagement record |
| Follow | `followers` | Directed user–user relationship |
| Upload | `uploads` | Staged image metadata |
| Hashtag | `hashtags` | Unique tag extracted from post content |
| PostHashtag | `post_hashtags` | Post–hashtag association |
| SearchOutbox | `search_outbox` | Async Meilisearch indexing queue |

## Entity Relationships

```
users ──< sessions
users ──< followers (follower → followed)
users ──< posts ──< likes
                 ──< post_hashtags >── hashtags
users ──< uploads
search_outbox (outbox queue for Meilisearch sync)
```

## Schema

### users

| Column | Type | Constraints |
|---|---|---|
| id | serial | PRIMARY KEY |
| name | varchar(255) | NOT NULL |
| username | varchar(255) | NOT NULL, UNIQUE |
| email | varchar(255) | NOT NULL, UNIQUE |
| password | varchar(255) | NOT NULL |
| bio | varchar(255) | DEFAULT '' |
| profile_photo_key | varchar(255) | DEFAULT '' |
| cover_photo_key | varchar(255) | DEFAULT '' |
| created | timestamptz | NOT NULL, DEFAULT now() |

### sessions

| Column | Type | Constraints |
|---|---|---|
| id | varchar(255) | PRIMARY KEY — stores HMAC-SHA256 hash of the raw session ID, never the raw value |
| user_id | integer | FK → users.id ON DELETE CASCADE |
| created | timestamptz | NOT NULL, DEFAULT now() |

### posts

| Column | Type | Constraints |
|---|---|---|
| id | serial | PRIMARY KEY |
| user_id | integer | FK → users.id ON DELETE CASCADE |
| content | varchar(255) | |
| hashtags | varchar(50)[] | DEFAULT '{}' |
| media_key | varchar(255) | DEFAULT '' |
| in_reply_to_id | integer | FK → posts.id ON DELETE SET NULL |
| quote_of_id | integer | FK → posts.id ON DELETE SET NULL |
| repost_of_id | integer | FK → posts.id ON DELETE CASCADE |
| created | timestamptz | NOT NULL, DEFAULT now() |

Check constraint `posts_repost_exclusive`: `repost_of_id IS NULL OR (content IS NULL AND quote_of_id IS NULL AND in_reply_to_id IS NULL)`

Unique constraint `posts_repost_unique`: `(user_id, repost_of_id)`


### likes

| Column | Type | Constraints |
|---|---|---|
| post_id | integer | FK → posts.id ON DELETE CASCADE |
| user_id | integer | FK → users.id ON DELETE CASCADE |
| created | timestamptz | NOT NULL, DEFAULT now() |

Unique: `(post_id, user_id)`.

### followers

| Column | Type | Constraints |
|---|---|---|
| user_id | integer | FK → users.id ON DELETE CASCADE |
| follower_id | integer | FK → users.id ON DELETE CASCADE |
| created | timestamptz | NOT NULL, DEFAULT now() |

Unique: `(user_id, follower_id)`. Check: `user_id <> follower_id`.

### uploads

| Column | Type | Constraints |
|---|---|---|
| filename | varchar(255) | PRIMARY KEY — server-generated UUIDv4 filename |
| user_id | integer | FK → users.id ON DELETE CASCADE |
| created | timestamptz | NOT NULL, DEFAULT now() |

### hashtags

| Column | Type | Constraints |
|---|---|---|
| id | serial | PRIMARY KEY |
| name | varchar(50) | NOT NULL, UNIQUE |

### post_hashtags

| Column | Type | Constraints |
|---|---|---|
| post_id | integer | NOT NULL, FK → posts.id ON DELETE CASCADE |
| hashtag_id | integer | NOT NULL, FK → hashtags.id ON DELETE CASCADE |

Primary key: `(post_id, hashtag_id)`.

### search_outbox

| Column | Type | Constraints |
|---|---|---|
| id | bigserial | PRIMARY KEY |
| entity_type | varchar(20) | NOT NULL |
| entity_id | text | NOT NULL |
| attempts | integer | NOT NULL, DEFAULT 0 |
| created_at | timestamptz | NOT NULL, DEFAULT now() |

Entity types: `'user'` (written by userservice on create/update), `'post'`, `'hashtag'` (written by postservice on create/delete).

## Indexes

| Table | Index | Purpose |
|---|---|---|
| users | `lower(username) text_pattern_ops` | LIKE prefix search on username |
| sessions | `sessions_user_id_idx` | Session lookup by user |
| posts | `posts_user_id_created_idx (user_id, created DESC)` | User timeline pagination |
| posts | `posts_created_idx (created DESC) WHERE in_reply_to_id IS NULL` | Feed ordering (partial) |
| posts | `posts_in_reply_to_id_idx WHERE in_reply_to_id IS NOT NULL` | Reply lookup (partial) |
| posts | `posts_repost_of_id_idx WHERE repost_of_id IS NOT NULL` | Repost lookup (partial) |
| posts | `posts_hashtags_idx` GIN on `hashtags` | Hashtag array search |
| likes | `likes_user_id_idx` | User's liked posts |
| followers | `followers_follower_id_idx` | User's following list |
| hashtags | `hashtags_name_trgm_idx` GIN trgm on `name` | Trigram typeahead |
| post_hashtags | `post_hashtags_hashtag_id_idx` | Tag's posts |
| search_outbox | `search_outbox_created_idx` | Worker polling order |

## Meilisearch Indexes

| Index | Searchable fields | Sortable | Primary key |
|---|---|---|---|
| users | username, name | — | id |
| posts | content, username | created_at | id |
| hashtags | name | post_count | id |

## Domain Invariants

- Sessions store the HMAC-SHA256 hash of the session ID. The raw 28-char ID is returned to the client; only the hash is persisted.
- A post is exactly one type: plain (content only), reply (content + in_reply_to_id), quote (content + quote_of_id), or repost (repost_of_id only). Repost exclusivity is enforced by DB CHECK; reply–quote exclusivity is enforced by the application.
- Reposts resolve to the canonical original: `repost_of_id = COALESCE(source.repost_of_id, source.id)`. Chains never exceed one hop.
- User counters (posts, likes, following, followers) and boolean states (liked, reposted, followed) are computed at read time via subqueries — no stored counter columns.
- Uploads are staged at `staging/{filename}` in S3 until `ConsumeUpload` moves them to `{filename}`.
- Hashtag names are stored lowercase and are globally unique.
- `posts.hashtags` (varchar array) mirrors the post_hashtags relational data but is not actively written by the application; the `hashtags` and `post_hashtags` tables are the authoritative source.
