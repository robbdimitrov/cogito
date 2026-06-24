# API

All endpoints are served by the Go gateway on port 8080. All responses are JSON. Error bodies are `{"message": "..."}`.

## Middleware Stack

Applied in this order (outermost to innermost):

1. `requestIDMiddleware` — Extracts or generates `X-Request-ID`; stores in request context
2. `loggerMiddleware` — JSON log per request: `request_id`, `method`, `route`, `path`, `status`, `duration_ms`
3. `secureHeadersMiddleware` — Injects security headers (see security.md)
4. `bodyLimitMiddleware` — Hard 2 MB limit on all request bodies
5. `authGuard` — Validates `session` cookie; sets `userId` in context (before rate limiting so ID is available for key generation)
6. `rateLimitMiddleware` — Token-bucket per user/session/IP via Dragonfly
7. `concurrencyLimiter` — Semaphore per request class; returns 503 when full

## Auth Guard Bypass

| Method | Path |
|---|---|
| GET | / |
| POST | /users |
| POST | /sessions |
| DELETE | /sessions |

All other routes require a valid `session` cookie.

## Rate Limit Policies

| Policy | Burst | Rate (req/s) | Endpoints |
|---|---|---|---|
| strict | 5 | 200 | POST /sessions, POST /users, POST /uploads |
| typeahead | 20 | 5 000 | GET /users/search, GET /hashtags/search, GET /search |
| read | 120 | 2 000 | All other GET / HEAD |
| mutation | 30 | 1 000 | All other POST / PUT / DELETE / PATCH |

Rate limit key: `{policy}:user:{id}` (authenticated) → `{policy}:session:{cookie}` → `{policy}:ip:{ip}`

## Concurrency Limits

| Class | Default cap | Env var |
|---|---|---|
| upload (POST /uploads) | 8 | CONCURRENCY_UPLOAD_LIMIT |
| read (GET/HEAD) | 64 | CONCURRENCY_READ_LIMIT |
| mutation (all others) | 24 | CONCURRENCY_MUTATION_LIMIT |

## Error Mapping

The gateway preserves gRPC status for HTTP control flow while returning JSON
error bodies. Standard mappings include `InvalidArgument` → 400,
`Unauthenticated` → 401, `PermissionDenied` → 403, `NotFound` → 404, and
`AlreadyExists` → 409. Other gRPC failures map to 500 unless a controller
handles them explicitly.

## Pagination

- All list endpoints accept `cursor` (opaque string) and `limit` (integer) query params.
- Default limit: 20. Min: 1. Max: 100 (except `GET /hashtags/search`: default 8, max 20).
- Response shape: `{ "items": [...], "nextCursor": "..." }` (`nextCursor` is empty string when no next page).
- **PostService cursor** — base64url-encoded JSON: `{"created":"<RFC3339Nano>","id":<int32>}`
- **SearchService cursor** — base64url-encoded JSON: `{"offset":<int32>}` (capped at 1000)
- **NotificationService cursor** — base64url `<RFC3339Nano>,<id>` (created timestamp and notification ID)

## HTTP Endpoint Inventory

### Public (no auth required)

| Method | Path | Purpose |
|---|---|---|
| GET | / | Liveness — returns "OK" |
| POST | /users | Create account (name, username, email, password) |
| POST | /sessions | Login — sets `session` cookie; returns `{ id: userId }` |
| DELETE | /sessions | Logout — clears `session` cookie |

### Protected (session cookie required)

#### Sessions

| Method | Path | Purpose |
|---|---|---|
| GET | /sessions | List authenticated user's active sessions |
| DELETE | /sessions/{sessionId} | Delete a specific session (ownership enforced by gateway) |

#### Users

| Method | Path | Purpose |
|---|---|---|
| GET | /users?username= | Get user by username |
| GET | /users/search?q= | Search users by username/name (cursor + limit) |
| GET | /users/{userId} | Get user profile (email field included for own profile only) |
| PUT | /users/{userId} | Update profile or credentials (self only; 403 otherwise) |
| GET | /users/{userId}/following | Paginated following list |
| GET | /users/{userId}/followers | Paginated followers list |
| POST | /users/{userId}/following | Follow user |
| DELETE | /users/{userId}/following | Unfollow user |

#### Notifications

| Method | Path | Purpose |
|---|---|---|
| GET | /notifications | Keyset-paginated notifications for the authenticated user |
| PUT | /notifications/{id}/read | Mark one authenticated user's notification as read |
| GET | /notifications/unread-count | Count unread notifications for the authenticated user |

#### Posts

| Method | Path | Purpose |
|---|---|---|
| POST | /posts | Create post (content, mediaKey?, inReplyToId?, quoteOfId?) |
| GET | /posts | Home feed (alias for /posts/feed) |
| GET | /posts/feed | Non-reply posts from followed accounts, cursor-paginated; backed by a materialized feed table with pull-merge for high-follower accounts |
| GET | /posts/{postId} | Get single post |
| DELETE | /posts/{postId} | Delete own post; removes associated image via ImageService |
| POST | /posts/{postId}/likes | Like post (idempotent) |
| DELETE | /posts/{postId}/likes | Unlike post |
| POST | /posts/{postId}/reposts | Repost (idempotent; resolves to original post) |
| DELETE | /posts/{postId}/reposts | Remove repost |
| GET | /posts/{postId}/replies | Paginated replies (oldest-first) |
| GET | /users/{userId}/posts | Paginated user timeline |
| GET | /users/{userId}/likes | Paginated posts liked by user |
| GET | /hashtags/{tag}/posts | Paginated posts with hashtag |
| GET | /hashtags/search?q= | Hashtag prefix/trigram search |

#### Search

| Method | Path | Purpose |
|---|---|---|
| GET | /search?q=&type= | Full-text search; `type` ∈ `posts`, `users`, `hashtags` |

#### Images

| Method | Path | Purpose |
|---|---|---|
| POST | /uploads | Upload image — proxied to imageservice (requires auth) |
| GET | /uploads/{filename} | Serve image — proxied to imageservice (no auth required) |

## JSON Response Shapes

**User**
```json
{
  "id": 1, "name": "string", "username": "string",
  "email": "string",
  "bio": "string", "posts": 0, "likes": 0,
  "following": 0, "followers": 0, "followed": false,
  "created": "2024-01-01T00:00:00Z",
  "profilePhotoKey": "string", "coverPhotoKey": "string"
}
```
`email` omitted for other users. `profilePhotoKey`/`coverPhotoKey` omitted when empty.

**Post**
```json
{
  "id": 1, "userId": 1, "content": "string",
  "likes": 0, "liked": false, "reposts": 0, "reposted": false,
  "created": "2024-01-01T00:00:00Z",
  "mediaKey": "string", "replies": 0,
  "inReplyToId": 0, "quoteOfId": 0, "quotePost": {},
  "repostOfId": 0, "repostOf": {}, "user": {}
}
```
Zero-value integer fields and null nested objects are omitted.

**Notification**
```json
{
  "id": 1, "externalId": 1, "userId": 1, "actorId": 1,
  "type": "like", "entityId": "string",
  "read": false, "created": "2024-01-01T00:00:00Z"
}
```
`type` ∈ `like`, `repost`, `reply`, `follow`. `entityId` is the post ID (string) for post events, empty for follows.

**Session** — `{ "id": "string", "userId": 1, "created": "2024-01-01T00:00:00Z" }`

**Hashtag** — `{ "id": 1, "name": "string", "postCount": 0 }`

## gRPC Services

All gateway→backend calls carry `internal-token` and `user-id` metadata headers. Standard timeout: 10 seconds. Search endpoints: 5 seconds.

### UserService

| Method | Key request fields | Response |
|---|---|---|
| CreateUser | name, username, email, password | Identifier (id) |
| GetUser | user_id | User |
| GetUserByUsername | username | User |
| GetUsersByIds | ids[] | Users (lightweight — counts are 0) |
| UpdateUser | name, username, email, password, old_password, bio, profile_photo_key?, cover_photo_key? | Empty |
| GetFollowing | user_id, cursor, limit | Users |
| GetFollowers | user_id, cursor, limit | Users |
| FollowUser | user_id | Empty |
| UnfollowUser | user_id | Empty |
| SearchUsers | query, limit | Users |

### AuthService

| Method | Key request fields | Response |
|---|---|---|
| CreateSession | email, password | Session (id, user_id, created) |
| GetSession | session_id | Session |
| DeleteSession | session_id | Empty |
| GetSessions | user_id | Sessions |

### PostService

| Method | Key request fields | Response |
|---|---|---|
| CreatePost | content, media_key?, in_reply_to_id?, quote_of_id? | Identifier |
| GetFeed | cursor, limit | Posts |
| GetPosts | user_id, cursor, limit | Posts |
| GetLikedPosts | user_id, cursor, limit | Posts |
| GetHashtagPosts | tag, cursor, limit | Posts |
| GetPost | post_id | Post |
| GetPostsByIds | ids[] | Posts |
| DeletePost | post_id | Empty |
| LikePost | post_id | Empty |
| UnlikePost | post_id | Empty |
| RepostPost | post_id | Empty |
| RemoveRepost | post_id | Empty |
| GetReplies | post_id, cursor, limit | Posts |
| SearchHashtags | query, limit | Hashtags |

### ImageService (gRPC)

| Method | Key request fields | Response |
|---|---|---|
| VerifyUpload | filename, user_id | Empty |
| ConsumeUpload | filename | Empty |
| DeleteImage | filename | Empty |

### SearchService

| Method | Key request fields | Response |
|---|---|---|
| SearchUsers | query, cursor, limit | Users |
| SearchPosts | query, cursor, limit | Posts |
| SearchHashtags | query, cursor, limit | Hashtags |

### NotificationService

| Method | Key request fields | Response |
|---|---|---|
| GetNotifications | user_id, cursor, limit | Notifications (list + nextCursor) |
| MarkNotificationRead | notification_id, user_id | Empty |
| GetUnreadCount | user_id | UnreadCountResponse (count) |

## Image Proxy

- `POST /uploads` — forwards multipart body to `imageservice:8081/uploads`; injects `x-user-id` (from session) and `internal-token` headers.
- `GET /uploads/{filename}` — forwards to `imageservice:8081/uploads/{filename}`.
- GET retry: 3 attempts, linear backoff 100 ms × attempt number.
- Circuit breaker: opens after 5 consecutive transient errors (502/503/504); 30-second cooldown.
- Non-GET requests: no retry.
