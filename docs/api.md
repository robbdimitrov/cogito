# API

All endpoints are served by the Go gateway on port 8080. All responses are JSON.
Error bodies are `{"message": "..."}`.

## Middleware Stack

Applied in this order (outermost to innermost):

1. `requestIDMiddleware` — Extracts or generates `X-Request-ID`; stores in
   request context
2. `loggerMiddleware` — JSON log per request: `request_id`, `method`, `route`,
   `path`, `status`, `duration_ms`
3. `secureHeadersMiddleware` — Injects security headers (see security.md)
4. `bodyLimitMiddleware` — Hard 2 MB limit on all request bodies
5. `authGuard` — Validates `session` cookie; sets `userId` in context (before
   rate limiting so ID is available for key generation)
6. `rateLimitMiddleware` — Token-bucket per user/session/IP via Dragonfly
7. `concurrencyLimiter` — Semaphore per request class; returns 503 when full

## Auth Guard Bypass

| Method     | Path                |
| ---------- | ------------------- |
| GET        | /                   |
| GET / HEAD | /uploads/{filename} |
| POST       | /users              |
| POST       | /sessions           |
| DELETE     | /sessions           |
| GET        | /users              |
| GET        | /users/{userId}     |
| GET        | /users/{userId}/posts |
| GET        | /posts/{postId}     |

All other routes require a valid `session` cookie. The last four rows above
are matched by path shape (`isPublicPostRead`/`isPublicUserRead` in
`auth_guard.go`), not full anonymity like account creation/login — the
handler still reads a session if one is present and degrades gracefully
without one (`liked`/`reposted`/`followed` come back `false`, email is
hidden). `GET /posts/feed` has the same single-path-segment shape but is
explicitly excluded and stays session-required.

## Rate Limit Policies

| Policy    | Burst | Rate (req/s) | Endpoints                                  |
| --------- | ----- | ------------ | ------------------------------------------- |
| strict    | 5     | 200          | POST /sessions, POST /users, POST /uploads |
| typeahead | 20    | 5 000        | GET /search                                |
| read      | 120   | 2 000        | All other GET / HEAD                       |
| mutation  | 30    | 1 000        | All other POST / PUT / DELETE / PATCH      |

Rate limit key: `{policy}:user:{id}` (authenticated) →
`{policy}:session:{cookie}` → `{policy}:ip:{ip}`

## Concurrency Limits

| Class                  | Default cap | Env var                    |
| ---------------------- | ----------- | -------------------------- |
| upload (POST /uploads) | 8           | CONCURRENCY_UPLOAD_LIMIT   |
| read (GET/HEAD)        | 64          | CONCURRENCY_READ_LIMIT     |
| mutation (all others)  | 24          | CONCURRENCY_MUTATION_LIMIT |

## Error Mapping

The gateway preserves gRPC status for HTTP control flow while returning JSON
error bodies. Standard mappings include `InvalidArgument` → 400,
`Unauthenticated` → 401, `PermissionDenied` → 403, `NotFound` → 404, and
`AlreadyExists` → 409, `ResourceExhausted` → 429, `Unavailable` → 503, and
`DeadlineExceeded` → 504. Gateway body-limit failures return 413. Other gRPC
failures map to 500 unless a controller handles them explicitly.

## Pagination

- All list endpoints accept `cursor` (opaque string) and `limit` (integer) query
  params.
- Malformed `limit` values and values outside the endpoint range return 400.
- Default limit: 20. Min: 1. Max: 100.
- Response shape: `{ "items": [...], "nextCursor": "..." }` (`nextCursor` is
  empty string when no next page).
- **PostService cursor** — base64url-encoded JSON:
  `{"created":"<RFC3339Nano>","id":<int32>}`
- **SearchService cursor** — base64url-encoded JSON: `{"offset":<int32>}`
  (capped at 1000)
- **Popular posts cursor** (`GET /search/popular`, PostService `GetPopularPosts`)
  — base64url-encoded JSON `{"offset":<int32>}` (capped at 1000), the same
  offset convention as SearchService, since the ranking key is a computed
  engagement score rather than a stable keyset column
- **Blended search cursor** (`type=all` only) — base64url-encoded JSON
  `{"u":"<users cursor>","p":"<posts cursor>","h":"<hashtags cursor>"}`
  wrapping three opaque SearchService cursors; `nextCursor` is empty only
  when all three are exhausted.
- **NotificationService cursor** — base64url `<RFC3339Nano>,<id>` (created
  timestamp and notification ID)

## HTTP Endpoint Inventory

### Public (no auth required)

| Method     | Path                | Purpose                                                 |
| ---------- | ------------------- | ------------------------------------------------------- |
| GET        | /                   | Liveness — returns "OK"                                 |
| GET / HEAD | /uploads/{filename} | Serve image — proxied to imageservice; optional `?size=thumb` for a cached 128x128 cover-cropped JPEG thumbnail |
| POST       | /users              | Create account (name, username, email, password)        |
| POST       | /sessions           | Login — sets `session` cookie; returns `{ id: userId }` |
| DELETE     | /sessions           | Logout — clears `session` cookie                        |

### Anonymous-readable (viewer-optional)

Unlike the routes above, these accept an optional session — an absent one
isn't a bypass so much as a degrade: `liked`/`reposted`/`followed` come back
`false` and `email` is hidden, exactly as they would for a viewer who isn't
the resource owner.

| Method | Path                  | Purpose                                                       |
| ------ | --------------------- | -------------------------------------------------------------- |
| GET    | /users?username=      | Get user by username (email hidden unless self)                |
| GET    | /users/{userId}       | Get user profile (email field included for own profile only)   |
| GET    | /users/{userId}/posts | Paginated user timeline                                         |
| GET    | /posts/{postId}       | Get single post                                                 |

### Protected (session cookie required)

#### Sessions

| Method | Path                  | Purpose                                                   |
| ------ | --------------------- | --------------------------------------------------------- |
| GET    | /sessions             | List authenticated user's active sessions                 |
| DELETE | /sessions/{sessionId} | Delete a specific session (ownership enforced by gateway) |

#### Users

`GET /users?username=`, `GET /users/{userId}`, and `GET /users/{userId}/posts`
are anonymous-readable — see above. Everything below still requires a session.

| Method | Path                      | Purpose                                                      |
| ------ | ------------------------- | ------------------------------------------------------------ |
| PUT    | /users/{userId}           | Update profile or credentials (self only; 403 otherwise)     |
| GET    | /users/{userId}/following | Paginated following list                                     |
| GET    | /users/{userId}/followers | Paginated followers list                                     |
| POST   | /users/{userId}/following | Follow user                                                  |
| DELETE | /users/{userId}/following | Unfollow user                                                |

#### Notifications

| Method | Path                        | Purpose                                                   |
| ------ | --------------------------- | --------------------------------------------------------- |
| GET    | /notifications              | Keyset-paginated notifications for the authenticated user |
| PUT    | /notifications/{id}/read    | Mark one authenticated user's notification as read        |
| GET    | /notifications/unread-count | Count unread notifications for the authenticated user     |

#### Posts

`GET /posts/{postId}` is anonymous-readable — see above. Everything below
still requires a session.

| Method | Path                    | Purpose                                                                                                                                  |
| ------ | ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | /posts                  | Create post (content, mediaKey?, inReplyToId?, quoteOfId?)                                                                               |
| GET    | /posts                  | Home feed (alias for /posts/feed)                                                                                                        |
| GET    | /posts/feed             | Non-reply posts from followed accounts, cursor-paginated; backed by a materialized feed table with pull-merge for high-follower accounts |
| DELETE | /posts/{postId}         | Delete own post; removes associated image via ImageService                                                                               |
| POST   | /posts/{postId}/likes   | Like post (idempotent)                                                                                                                   |
| DELETE | /posts/{postId}/likes   | Unlike post                                                                                                                              |
| POST   | /posts/{postId}/reposts | Repost (idempotent; resolves to original post)                                                                                           |
| DELETE | /posts/{postId}/reposts | Remove repost                                                                                                                            |
| GET    | /posts/{postId}/replies | Paginated replies (oldest-first)                                                                                                         |
| GET    | /users/{userId}/likes   | Paginated posts liked by user                                                                                                            |
| GET    | /users/{userId}/replies | Paginated replies authored by user, newest-first                                                                                        |
| GET    | /hashtags/{tag}/posts   | Paginated posts with hashtag                                                                                                             |

#### Search

| Method | Path                | Purpose                                                        |
| ------ | ------------------- | -------------------------------------------------------------- |
| GET    | /search?q=&type=    | Full-text search; `type` ∈ `all`, `posts`, `users`, `hashtags` |
| GET    | /search/popular     | Posts ranked by recent engagement, cursor-paginated; for the empty-query search screen |
| GET    | /search/recent      | Last 10 saved searches for the authenticated user              |
| POST   | /search/recent      | Save or bump a recent search `{type, reference}`               |
| DELETE | /search/recent/{id} | Remove one authenticated user's recent search                  |
| DELETE | /search/recent      | Clear authenticated user's recent searches                     |

`GET /search/popular` calls PostService's `GetPopularPosts`, not
SearchService — it's a Postgres ranking (likes + replies) over posts created
in the last 7 days, not a Meilisearch lookup. Only original, top-level posts
with at least one like or reply are ranked (no replies, reposts, or
zero-engagement posts). Response shape matches other post lists:
`{"items": [Post...], "nextCursor": "..."}`.

`type=all` returns one relevance-ranked list blending all three entity
types (~20% users / 60% posts / 20% hashtags), interleaved rather than
grouped, for the search results page. Live typeahead fetches users and
hashtags only, interleaves them, and caps the combined dropdown at 10. Each
item is `{"type": "users"|"posts"|"hashtags", "item": {...}}`, where `item`
has the same shape as the corresponding single-type result. If one entity
type's lookup fails, the response still returns the other two; only a
failure of all three returns an error.

Recent searches use `{"id","type","item"}`. `type` is `users`, `hashtags`, or
`queries`; entity items use the corresponding search result shape, and
`queries` stores the submitted search text. Recording a recent search de-dupes
by `(user, type, reference)`, bumps repeats to the top, and trims the list back
to 10 in the same transaction.

#### Images

| Method | Path     | Purpose                                                |
| ------ | -------- | ------------------------------------------------------ |
| POST   | /uploads | Upload image — proxied to imageservice (requires auth) |

## JSON Response Shapes

**User**

```json
{
  "id": 1,
  "name": "string",
  "username": "string",
  "email": "string",
  "bio": "string",
  "posts": 0,
  "likes": 0,
  "following": 0,
  "followers": 0,
  "followed": false,
  "created": "2024-01-01T00:00:00Z",
  "profilePhotoKey": "string",
  "coverPhotoKey": "string"
}
```

`email` is always present as a key but empty-stringed for anyone other than
the account owner (no `omitempty` on this field — unlike `profilePhotoKey`/
`coverPhotoKey`, which are omitted when empty).

**Post**

```json
{
  "id": 1,
  "userId": 1,
  "content": "string",
  "likes": 0,
  "liked": false,
  "reposts": 0,
  "reposted": false,
  "created": "2024-01-01T00:00:00Z",
  "mediaKey": "string",
  "replies": 0,
  "inReplyToId": 0,
  "inReplyToUsername": "string",
  "quoteOfId": 0,
  "quotePost": {},
  "repostOfId": 0,
  "repostOf": {},
  "user": {}
}
```

Zero-value integer fields and null nested objects are omitted.
`inReplyToUsername` is only populated by `GET /users/{userId}/replies`
(the profile Replies tab), resolved from the reply's parent post in a
gateway-side batch call — it is never set by other endpoints.

**Notification**

```json
{
  "id": 1,
  "externalId": 1,
  "userId": 1,
  "actorId": 1,
  "type": "like",
  "entityId": "string",
  "read": false,
  "created": "2024-01-01T00:00:00Z",
  "actor": {}
}
```

`type` ∈ `like`, `repost`, `reply`, `follow`. `entityId` is the post ID (string)
for post events, empty for follows. `actor` is the batch-resolved User for
`actorId`, omitted when the gateway can't resolve it (upstream error or a
since-deleted user).

**Session** —
`{ "id": "string", "userId": 1, "created": "2024-01-01T00:00:00Z" }`

Session `id` values returned by `GET /sessions` are public revocation handles,
not stored session hashes or cookie credentials.

**Hashtag** — `{ "id": 1, "name": "string", "postCount": 0 }`

## gRPC Services

All gateway→backend calls carry `internal-token` and `user-id` metadata headers.
Standard timeout: 10 seconds. Search endpoints: 5 seconds.

### UserService

| Method            | Key request fields                                                                       | Response                           |
| ----------------- | ---------------------------------------------------------------------------------------- | ---------------------------------- |
| CreateUser        | name, username, email, password                                                          | Identifier (id)                    |
| GetUser           | user_id                                                                                  | User                               |
| GetUserByUsername | username                                                                                 | User                               |
| GetUsersByIds     | ids[]                                                                                    | Users (lightweight — counts are 0) |
| UpdateUser        | name, username, email, password, old_password, bio, profile_photo_key?, cover_photo_key? | Empty                              |
| GetFollowing      | user_id, cursor, limit                                                                   | Users                              |
| GetFollowers      | user_id, cursor, limit                                                                   | Users                              |
| FollowUser        | user_id                                                                                  | Empty                              |
| UnfollowUser      | user_id                                                                                  | Empty                              |

### AuthService

| Method        | Key request fields              | Response                             |
| ------------- | ------------------------------- | ------------------------------------ |
| CreateSession | email, password                 | Session (id, user_id, created)       |
| GetSession    | raw session_id                  | Session (includes internal handle)   |
| DeleteSession | raw session_id or public handle | Empty                                |
| GetSessions   | user_id                         | Sessions with public handles in `id` |

### PostService

| Method          | Key request fields                                 | Response   |
| --------------- | -------------------------------------------------- | ---------- |
| CreatePost      | content, media_key?, in_reply_to_id?, quote_of_id? | Identifier |
| GetFeed         | cursor, limit                                      | Posts      |
| GetPosts        | user_id, cursor, limit                             | Posts      |
| GetUserReplies  | user_id, cursor, limit                             | Posts      |
| GetLikedPosts   | user_id, cursor, limit                             | Posts      |
| GetHashtagPosts | tag, cursor, limit                                 | Posts      |
| GetPost         | post_id                                            | Post       |
| GetPostsByIds   | ids[]                                              | Posts      |
| DeletePost      | post_id                                            | Empty      |
| LikePost        | post_id                                            | Empty      |
| UnlikePost      | post_id                                            | Empty      |
| RepostPost      | post_id                                            | Empty      |
| RemoveRepost    | post_id                                            | Empty      |
| GetReplies      | post_id, cursor, limit                             | Posts      |
| GetPopularPosts | cursor, limit                                      | Posts      |

### ImageService (gRPC)

| Method        | Key request fields | Response |
| ------------- | ------------------ | -------- |
| VerifyUpload  | filename, user_id  | Empty    |
| ConsumeUpload | filename, user_id  | Empty    |
| DeleteImage   | filename           | Empty    |

### SearchService

| Method              | Key request fields   | Response       |
| ------------------- | -------------------- | -------------- |
| SearchUsers         | query, cursor, limit | Users          |
| SearchPosts         | query, cursor, limit | Posts          |
| SearchHashtags      | query, cursor, limit | Hashtags       |
| ListRecentSearches  | user-id metadata     | RecentSearches |
| RecordRecentSearch  | type, reference      | Empty          |
| DeleteRecentSearch  | id                   | Empty          |
| ClearRecentSearches | user-id metadata     | Empty          |

### NotificationService

| Method               | Key request fields       | Response                          |
| -------------------- | ------------------------ | --------------------------------- |
| GetNotifications     | user_id, cursor, limit   | Notifications (list + nextCursor) |
| MarkNotificationRead | notification_id, user_id | Empty                             |
| GetUnreadCount       | user_id                  | UnreadCountResponse (count)       |

## Image Proxy

- `POST /uploads` — forwards multipart body to `imageservice:8081/uploads`;
  injects `x-user-id` (from session) and `internal-token` headers.
- `GET /uploads/{filename}` and `HEAD /uploads/{filename}` — public image reads
  forwarded to `imageservice:8081/uploads/{filename}`, including any `?size=`
  query string.
- `size` accepts only the literal value `thumb`; imageservice rejects any
  other value with 400. On first request for a given original, imageservice
  derives, caches, and serves a 128x128 cover-cropped JPEG thumbnail keyed off
  the validated filename (`thumb/{filename}`); later requests are cache hits.
- The gateway strips client-supplied `internal-token`, `x-user-id`, and
  `user-id` before proxying image HTTP requests, then injects its own
  `internal-token`. Authenticated upload proxying also injects gateway-derived
  `x-user-id`.
- GET retry: 3 attempts, linear backoff 100 ms × attempt number.
- Circuit breaker: opens after 5 consecutive transient errors (502/503/504);
  30-second cooldown.
- Non-GET requests: no retry.
