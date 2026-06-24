# Frontend

## Stack

| Item             | Value                                                             |
| ---------------- | ----------------------------------------------------------------- |
| Framework        | SvelteKit 2, Svelte 5                                             |
| Language         | TypeScript (strict)                                               |
| CSS              | Tailwind v4, DaisyUI v5                                           |
| Rendering        | SSR — all routes server-rendered; no client-side fetch to backend |
| Backend base URL | `BACKEND_URL` env var (default: `http://localhost:8080`)          |

## Route Map

### Public

| Route   | Action / purpose                                                             |
| ------- | ---------------------------------------------------------------------------- |
| /login  | POST — email + password → session cookie → redirect /                        |
| /signup | POST — name + username + email + password → create user + login → redirect / |
| /logout | POST — DELETE /sessions, clear cookie → redirect /login                      |
| /health | GET — health check                                                           |

### Protected (session required)

| Route                 | Load                                                            | Actions                                            |
| --------------------- | --------------------------------------------------------------- | -------------------------------------------------- |
| /                     | Feed (posts, nextCursor)                                        | createPost, toggleLike, toggleRepost, deletePost   |
| /{username}           | Profile + user posts                                            | toggleLike, toggleRepost, deletePost, toggleFollow |
| /{username}/likes     | User's liked posts                                              | same post/follow actions                           |
| /{username}/followers | Followers list                                                  | toggleFollow                                       |
| /{username}/following | Following list                                                  | toggleFollow                                       |
| /posts/{id}           | Post + replies                                                  | createReply, toggleLike, toggleRepost, deletePost  |
| /hashtags/{tag}       | Tag post feed                                                   | toggleLike, toggleRepost, deletePost               |
| /search               | Search results (q, type params)                                 | —                                                  |
| /notifications        | Notifications (unread rows marked read server-side after fetch) | —                                                  |
| /settings             | Redirect to /settings/profile                                   | —                                                  |
| /settings/profile     | Current user profile                                            | default — update name/username/email/bio/photos    |
| /settings/password    | Password form                                                   | default — change password (old + new)              |
| /settings/sessions    | Active sessions                                                 | deleteSession                                      |

Route params: `username` (any string), `tab` (matches `likes`, `followers`, `following`).

## Layout Hierarchy

```
+layout.svelte            root — reads theme cookie, sets ThemeContext
  (auth)/+layout.svelte   guard: redirect / if already authenticated
    /login, /signup
  (app)/+layout.svelte    guard: redirect /login if unauthenticated; loads currentUser
    /(main)/+page.svelte  feed
    /[username]/+layout.svelte  loads profile user (404 if not found)
      /[username]/+page.svelte  posts tab
      /[username]/[tab]/+page.svelte  likes / followers / following
    /posts/[id]/+page.svelte
    /hashtags/[tag]/+page.svelte
    /search/+page.svelte
    /notifications/+page.svelte
    settings/+layout.svelte  settings sidebar nav
      /settings/profile, /settings/password, /settings/sessions
```

## Auth Guards

| Guard                | File                     | Condition                            | Redirect      |
| -------------------- | ------------------------ | ------------------------------------ | ------------- |
| Prevent authed users | (auth)/+layout.server.ts | `resolveCurrentUser` → authenticated | 303 to /      |
| Require auth         | (app)/+layout.server.ts  | Session absent or invalid            | 303 to /login |

`resolveCurrentUser(fetch)`:

1. Calls `GET /sessions` → returns `currentSessionId` and `userId`.
2. Calls `GET /users/{userId}` → returns full user object.
3. On any failure: returns `{ status: "unavailable" }` — layout redirects to /login.

## Data Fetching Strategy

| Pattern                     | When used                                           |
| --------------------------- | --------------------------------------------------- |
| `+page.server.ts` `load`    | Initial page data — runs server-side only           |
| `+page.server.ts` `actions` | All mutations — form actions with `use:enhance`     |
| `+server.ts` `GET`          | Client-driven pagination "load more" — returns JSON |
| `createPagination<T>()`     | Client-side state for progressive list loading      |

No data is fetched on component mount. The browser never calls the backend directly.

## SSR Boundary

Everything runs in the Node server. `apiClient(event)` resolves backend paths against `BACKEND_URL` and forwards the session cookie. These are server-to-server requests; they never cross CORS.

Browser-initiated fetches for pagination hit same-origin SvelteKit `+server.ts` handlers, which call the backend server-side.

Backend-authored error bodies are not UI copy. The shared backend response
unwrap helper preserves HTTP status for route control flow, but maps failed
responses to frontend-owned fallback messages instead of rendering backend
`message` fields, raw response text, status text, or exception details. Form
actions may choose more specific frontend-owned copy based on context and
status. Normal response data, including user-authored content, is rendered
unchanged after DTO mapping.

## Key Frontend Routes

| Path                    | Method | Handler         | Backend call                                                              |
| ----------------------- | ------ | --------------- | ------------------------------------------------------------------------- |
| `/`                     | GET    | page load       | GET /posts/feed                                                           |
| `/`                     | GET    | +server.ts      | GET /posts/feed?cursor=                                                   |
| `/{username}`           | GET    | page load       | GET /users?username= + GET /users/{id}/posts                              |
| `/{username}`           | GET    | +server.ts      | GET /users/{id}/posts?cursor=                                             |
| `/{username}/likes`     | GET    | page load       | GET /users/{id}/likes                                                     |
| `/{username}/likes`     | GET    | +server.ts      | GET /users/{id}/likes?cursor=                                             |
| `/{username}/followers` | GET    | page load       | GET /users/{id}/followers                                                 |
| `/{username}/followers` | GET    | +server.ts      | GET /users/{id}/followers?cursor=                                         |
| `/{username}/following` | GET    | page load       | GET /users/{id}/following                                                 |
| `/{username}/following` | GET    | +server.ts      | GET /users/{id}/following?cursor=                                         |
| `/posts/{id}`           | GET    | page load       | GET /posts/{id} + GET /posts/{id}/replies                                 |
| `/hashtags/{tag}`       | GET    | page load       | GET /hashtags/{tag}/posts                                                 |
| `/hashtags/{tag}`       | GET    | +server.ts      | GET /hashtags/{tag}/posts?cursor=                                         |
| `/search`               | GET    | page load       | GET /search?q=&type=                                                      |
| `/notifications`        | GET    | app layout load | GET /notifications/unread-count                                           |
| `/notifications`        | GET    | page load       | GET /notifications + PUT /notifications/{id}/read for unread rows         |
| `/notifications`        | GET    | +server.ts      | GET /notifications?cursor= + PUT /notifications/{id}/read for unread rows |
| `/api/users/search`     | GET    | +server.ts      | GET /users/search?q=                                                      |
| `/api/hashtags/search`  | GET    | +server.ts      | GET /hashtags/search?q=                                                   |
| `/uploads/{key}`        | GET    | +server.ts      | GET /uploads/{key} (proxied)                                              |
| `/health`               | GET    | +server.ts      | returns "ok"                                                              |

## Image Proxy

`GET /uploads/[key]` in `src/routes/uploads/[key]/+server.ts`:

- Validates `key` against `^[A-Za-z0-9._-]{1,255}$`; rejects keys containing `..` — 404 on failure.
- Streams response body from backend without buffering in the Node process.
- Forwards: `content-type`, `content-length`, `etag`, `last-modified`, `cache-control`.

## Pagination

- Initial paginated data returned by `load` functions follows each page's
  existing prop names, with `nextCursor: string | null`.
- Subsequent pages: client calls the corresponding same-origin `+server.ts` GET route with `?cursor=`.
- `createPagination<T>()` state: `items`, `cursor`, `loading`. `more()` appends and advances cursor.
- Used in: feed, user posts, liked posts, followers, following, hashtag feed.
- The feed renders a first-page empty state linking to `/search` when
  `/posts/feed` returns no items and no cursor.
- `/notifications` paginates through same-origin `+server.ts`; each fetched
  unread notification is marked read server-side after the page is retrieved.

## Image Upload Flow

1. User selects file in form.
2. Server action calls `uploadImage(api, file)` — `POST /uploads` (multipart, field name `image`).
3. Response: `{ filename: string }`.
4. `filename` used as `mediaKey` in subsequent `createPost` or `updateUser` request.

## Session Cookie Relay

The login action calls `POST /sessions` via `event.fetch`. SvelteKit propagates the `Set-Cookie` response header from the backend through to the browser on the SvelteKit origin. After redirect, `event.cookies.get("session")` is non-null and `apiClient` includes it on all subsequent server-side backend calls as `Cookie: session={value}`.

On logout: `cookies.delete("session", { path: "/", httpOnly: true, sameSite: "strict" })` clears the cookie on the SvelteKit origin regardless of backend response.

## Security Headers (hooks.server.ts)

Applied to all responses:

| Header                 | Value                           |
| ---------------------- | ------------------------------- |
| X-Content-Type-Options | nosniff                         |
| X-Frame-Options        | SAMEORIGIN                      |
| Referrer-Policy        | strict-origin-when-cross-origin |

CSP: nonce-based, set by SvelteKit. See security.md for directives.
