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
| Max length      | 128 characters                                                               |
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
| Recent-search list / delete / clear    | FlowService              | Acting user derived from `user-id`; delete scopes by public row ID and owner                                               |
| Self-follow prevention                 | UserService              | Rejects if `req.user_id == current_user_id`                                                                                |
| Password change → session invalidation | Gateway                  | Fetches all user sessions; deletes all except current (matched by public handle returned from `GetSession`)                |

Image files are publicly readable at `GET /uploads/{filename}` — no ownership
check on serve. The optional `?size=` param only accepts the literal `thumb`;
imageservice rejects any other value with 400, bounding the derived-thumbnail
cache and resize cost to one variant per original instead of an
arbitrary-resize surface.

`GET /posts/{postId}`, `GET /users/{userId}`, `GET /users/{userId}/posts`, and
`GET /users?username=` are viewer-optional: `authGuard` (apigateway) validates
a `session` cookie if present but does not require one, so an anonymous caller
reaches the handler with no user ID. Ownership-sensitive fields degrade
correctly for that case — `liked`/`reposted`/`followed` read as `false`, and
`email` is hidden — the same way they already do for a different (non-owner)
authenticated caller. All other reads and every mutation remain
session-required with no anonymous path.

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

| Policy    | Burst | Rate (req/s) | Applies to                                 |
| --------- | ----- | ------------ | ------------------------------------------- |
| strict    | 5     | 0.2          | POST /sessions, POST /users, POST /uploads |
| typeahead | 20    | 5            | GET /search                                |
| read      | 120   | 2            | All other GET/HEAD                         |
| mutation  | 30    | 1            | All other POST/PUT/DELETE/PATCH            |

- Algorithm: Token bucket (Lua script in Dragonfly). TTL per key:
  `ceil(BURST / RATE * 2)` seconds.
- `RATE_LIMIT_FAIL_OPEN=true` (set in production manifest): allows requests when
  Dragonfly is unavailable.
- Rate limits are configurable per policy via env vars (e.g.,
  `RATE_LIMIT_STRICT_BURST`).
- Key derivation falls back to client IP only for unauthenticated requests
  with no session. `TRUST_PROXY=true` (set in the manifest) lets the gateway
  read that IP from `X-Forwarded-For`; safe only because NetworkPolicy
  restricts the gateway's port to the frontend BFF, which overwrites the
  header with the real client address before proxying (see
  `apps/frontend/src/lib/server/api/client.ts`). That overwrite in turn relies
  on frontend's own `ADDRESS_HEADER` config, which is only trustworthy behind
  a reverse proxy that sets it — no such proxy exists in this local cluster
  (frontend is reached only via `kubectl port-forward`), so the header is
  always absent and this whole chain is currently a no-op. Exposing frontend
  any other way requires a trusted reverse proxy in front of it, or client
  requests could spoof their own rate-limit identity end to end.

## Response Headers

No `Strict-Transport-Security` on either service: this deployment has no TLS
termination (local k3s only), and sending it over plain HTTP would be a false
guarantee to clients.

| Header                     | Value                                                                      | Set by                              |
| -------------------------- | -------------------------------------------------------------------------- | ------------------------------------ |
| X-Content-Type-Options     | nosniff                                                                    | Gateway, Frontend                   |
| X-Frame-Options            | DENY                                                                       | Gateway, Frontend                   |
| X-XSS-Protection           | 0 (legacy auditor disabled; CSP takes over)                                | Gateway                             |
| Referrer-Policy            | no-referrer                                                                | Gateway                             |
| Referrer-Policy            | strict-origin-when-cross-origin                                            | Frontend                            |
| Cross-Origin-Opener-Policy | same-origin                                                                | Frontend                            |
| Permissions-Policy         | camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=() | Frontend                            |
| Cache-Control              | private, max-age=86400                                                     | ImageService (image responses only) |

## Content Security Policy

### Frontend

Set by SvelteKit nonce-based CSP:

| Directive       | Value                                                                                                                               |
| --------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| default-src     | 'self'                                                                                                                              |
| script-src      | 'self' + nonce                                                                                                                      |
| style-src       | 'self'                                                                                                                              |
| style-src-attr  | 'unsafe-hashes' + two fixed inline style attribute hashes (SvelteKit's `#svelte-announcer`, `UserHeader`'s cover-photo placeholder) |
| img-src         | 'self' data: blob:                                                                                                                  |
| font-src        | 'self'                                                                                                                              |
| connect-src     | 'self'                                                                                                                              |
| object-src      | 'none'                                                                                                                              |
| frame-src       | 'none'                                                                                                                              |
| frame-ancestors | 'none'                                                                                                                              |
| base-uri        | 'self'                                                                                                                              |
| form-action     | 'self'                                                                                                                              |

### Gateway

Set unconditionally alongside the response headers above. The gateway only
ever emits JSON, so this stays fully locked down rather than carrying a
browser-app baseline this origin doesn't need.

| Directive       | Value  |
| --------------- | ------ |
| default-src     | 'none' |
| frame-ancestors | 'none' |
| base-uri        | 'none' |
| form-action     | 'none' |

## Upload Security

| Check             | Detail                                                                                                          |
| ----------------- | --------------------------------------------------------------------------------------------------------------- |
| Body limit        | Image field capped at 1 MB (enforced per-field during multipart read); the Axum router's own `DefaultBodyLimit` is a deliberately looser 2 MB backstop against abusive multipart bodies, not a second copy of the image limit |
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
5. On the viewer-optional routes (see Ownership Rules above), validation still
   runs if a `session` cookie is present — it's just not required. A missing
   or invalid cookie forwards no `user-id` header rather than rejecting the
   request.
