# Security

## Session Model

| Property              | Value                                                                                      |
| --------------------- | ------------------------------------------------------------------------------------------ |
| Session ID format     | 21 random bytes, base64url-encoded (no padding) — 28 characters                            |
| DB storage            | HMAC-SHA256 hash of the raw session ID (never the raw value)                               |
| Public session handle | Separate random handle used for listing and deleting sessions                              |
| HMAC secret           | `SESSION_HMAC_SECRET` env var (required; no safe default in production)                    |
| Cookie name           | `session`                                                                                  |
| Cookie attributes     | HttpOnly=true, SameSite=Strict, path=/, Secure=`COOKIE_SECURE` env var                     |
| Cookie TTL            | 7 days                                                                                     |
| Session expiry        | `SESSION_TTL_DAYS` env var (default 7, minimum 1); enforced on every read via WHERE clause |
| Background cleanup    | Runs every 3600 seconds; deletes expired sessions                                          |

## Password Policy

| Property        | Value                                                                        |
| --------------- | ---------------------------------------------------------------------------- |
| Algorithm       | Argon2id (default parameters)                                                |
| Min length      | 8 characters                                                                 |
| Max length      | 1024 characters                                                              |
| Lazy upgrade    | Rehashed at next login when stored params fall below current Argon2 defaults |
| Concurrency cap | `ARGON_MAX_CONCURRENCY` env var (default: 4 concurrent hash operations)      |

## Login Protections

| Measure        | Threshold                              | Window                                 | Key                    |
| -------------- | -------------------------------------- | -------------------------------------- | ---------------------- |
| IP throttle    | `THROTTLE_IP_FAILURES` (default 5)     | `THROTTLE_WINDOW_SECS` (default 900 s) | `login:ip:{client_ip}` |
| Email throttle | `THROTTLE_EMAIL_FAILURES` (default 50) | same                                   | `login:email:{email}`  |

- Counters stored in Dragonfly; atomic INCR + TTL via Lua script.
- Throttle fails open when Dragonfly is unavailable (logs warning, allows
  login).
- All login failures return `"Incorrect email or password."` — account existence
  is not revealed.
- Dummy Argon2 hash is evaluated on user-not-found to equalize response timing.
- Successful login clears both throttle keys.

## Ownership Rules

| Operation                              | Where enforced           | Mechanism                                                                                                                  |
| -------------------------------------- | ------------------------ | -------------------------------------------------------------------------------------------------------------------------- |
| Delete session by ID                   | Gateway                  | Fetch session handles for current user → compare public handle; 403 on mismatch                                            |
| Update user profile                    | Gateway                  | Compare path `{userId}` to context user ID; 403 if not self                                                                |
| Delete post                            | PostService              | `DELETE FROM posts WHERE id = $1 AND user_id = $2` (0 rows → not found)                                                    |
| Image upload ownership                 | ImageService HTTP + gRPC | `x-user-id`/`user_id` injected by gateway from validated session; consume atomically claims metadata by filename and owner |
| Notification read / unread-count       | FlowService              | Acting user derived from `user-id` gRPC metadata, not the request body                                                     |
| Self-follow prevention                 | UserService              | Rejects if `req.user_id == current_user_id`                                                                                |
| Password change → session invalidation | Gateway                  | Fetches all user sessions; deletes all except current (matched by public handle returned from `GetSession`)                |

Image files are publicly readable at `GET /uploads/{filename}` — no ownership
check on serve.

## Internal Service Authentication

- Header name: `internal-token`
- Secret: `INTERNAL_GRPC_TOKEN` env var (default dev value; `APP_ENV=production`
  enforces override)
- Applied to: all gRPC metadata and all imageservice HTTP requests
- Comparison: constant-time in all services (`subtle::ConstantTimeEq` in Rust;
  `subtle.ConstantTimeCompare` in Go)
- The gateway strips client-supplied `internal-token`, `x-user-id`, and
  `user-id` before proxying image HTTP requests, then injects gateway-owned
  internal authentication and identity headers for the target route.

## Rate Limiting

| Policy    | Burst | Rate (req/s) | Applies to                                           |
| --------- | ----- | ------------ | ---------------------------------------------------- |
| strict    | 5     | 200          | POST /sessions, POST /users, POST /uploads           |
| typeahead | 20    | 5 000        | GET /users/search, GET /hashtags/search, GET /search |
| read      | 120   | 2 000        | All other GET/HEAD                                   |
| mutation  | 30    | 1 000        | All other POST/PUT/DELETE/PATCH                      |

- Algorithm: Token bucket (Lua script in Dragonfly). TTL per key:
  `ceil(BURST / RATE * 2)` seconds.
- `RATE_LIMIT_FAIL_OPEN=true` (set in production manifest): allows requests when
  Dragonfly is unavailable.
- Rate limits are configurable per policy via env vars (e.g.,
  `RATE_LIMIT_STRICT_BURST`).

## Response Headers

| Header                 | Value                           | Set by                              |
| ---------------------- | ------------------------------- | ----------------------------------- |
| X-Content-Type-Options | nosniff                         | Gateway, Frontend                   |
| X-Frame-Options        | SAMEORIGIN                      | Gateway, Frontend                   |
| Referrer-Policy        | strict-origin-when-cross-origin | Gateway, Frontend                   |
| Cache-Control          | private, max-age=86400          | ImageService (image responses only) |

## Content Security Policy

Set by SvelteKit nonce-based CSP (frontend only):

| Directive       | Value                |
| --------------- | -------------------- |
| default-src     | 'self'               |
| script-src      | 'self' + nonce       |
| style-src       | 'self' unsafe-inline |
| img-src         | 'self' data: blob:   |
| font-src        | 'self'               |
| connect-src     | 'self'               |
| object-src      | 'none'               |
| frame-ancestors | 'self'               |
| base-uri        | 'self'               |
| form-action     | 'self'               |

## Upload Security

| Check             | Detail                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Body limit        | 1 MB — enforced at Axum router (`DefaultBodyLimit::max(1024 * 1024)`) and per-field during multipart read       |
| Format validation | Magic-byte check on first 12 bytes: JPEG (`\xff\xd8\xff`), PNG (8-byte sig), GIF (`GIF8`), WebP (`RIFF`…`WEBP`) |
| Filename          | Server-generated UUIDv4 + validated extension; client filename is ignored                                       |
| Path traversal    | Rejected if filename contains `..`, `/`, or `\` (checked on GET and gRPC lifecycle methods)                     |
| Error messages    | No filesystem paths, SQL details, internal tokens, or raw user input in responses                               |
| Staging           | Stored under `staging/{filename}` in S3 until owner-checked `ConsumeUpload` moves to `{filename}`               |

## User ID Propagation

1. Gateway validates `session` cookie via `AuthService.GetSession`.
2. Returned `user_id` stored in request context as string key `"userId"`.
3. Forwarded to gRPC backends as `user-id` metadata header.
4. Never trusted from client-supplied request fields.
