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
| /register | POST — name + username + email + password → create user + login → redirect / |
| /logout | POST — DELETE /sessions, clear cookie → redirect /login                      |
| /health | GET — health check                                                           |

### Anonymous-readable (no session required)

| Route        | Load                                            | Actions                                            |
| ------------ | ------------------------------------------------ | -------------------------------------------------- |
| /{username}  | Profile + user posts (paginates without a session) | toggleLike, toggleRepost, deletePost, toggleFollow — render as `/login` links for anonymous visitors |
| /posts/{id}  | Post; replies only loaded/shown when logged in    | createReply, toggleLike, toggleRepost, deletePost — render as `/login` links for anonymous visitors |

### Protected (session required)

| Route                 | Load                                                                    | Actions                                            |
| --------------------- | ----------------------------------------------------------------------- | -------------------------------------------------- |
| /                     | Feed (posts, nextCursor)                                                | createPost, toggleLike, toggleRepost, deletePost   |
| /{username}/replies   | User's own replies, each showing "Replying to @x" context               | same post/follow actions                           |
| /{username}/likes     | User's liked posts                                                      | same post/follow actions                           |
| /{username}/followers | Followers list                                                          | toggleFollow                                       |
| /{username}/following | Following list                                                          | toggleFollow                                       |
| /search               | Search results (`#tag` shows that tag's post feed) with users/hashtags typeahead and last 10 recent searches | toggleLike, toggleRepost, deletePost, remove/clear recent searches |
| /notifications        | Notifications (unread rows marked read client-side on mount, via a same-origin POST) | —                                                  |
| /settings             | Settings hub — appearance, links to Profile/Password/Sessions           | —                                                  |
| /settings/profile     | Current user profile                                                    | default — update name/username/email/bio/photos    |
| /settings/password    | Password form                                                           | default — change password (old + new)              |
| /settings/sessions    | Active sessions                                                         | deleteSession                                      |

Route params: `username` (any string), `tab` (matches `replies`, `likes`,
`followers`, `following` — the `[tab=tab]` route always requires a session,
enforced by a `(private)` layout guard nested under the profile route, even
though the profile route itself doesn't require one).

## Layout Hierarchy

```
+layout.svelte            root — reads theme cookie, sets ThemeContext
  (auth)/+layout.svelte   guard: redirect / if already authenticated
    /login, /register
  (app)/+layout.svelte    no redirect; loads currentUser: User | null
    /[username]/+layout.svelte  loads profile user (404 if not found)
      /[username]/+page.svelte  posts tab — anonymous-readable
      /[username]/(private)/+layout.server.ts  guard: redirect /login if unauthenticated
        /[username]/(private)/[tab]/+page.svelte  replies / likes / followers / following
    /posts/[id]/+page.svelte  anonymous-readable; replies/composer require a session
    (private)/+layout.server.ts  guard: redirect /login if unauthenticated
      /(main)/+page.svelte  feed
      /(main)/notifications/+page.svelte
      search/+page.svelte
      settings/+layout.svelte  centered account-flow wrapper, no shared nav
        /settings/+page.svelte  hub — appearance, drill-down links, logout
        /settings/profile, /settings/password, /settings/sessions  each owns
          its own back-arrow header
```

## Auth Guards

| Guard                | File                                          | Condition                            | Redirect      |
| -------------------- | ---------------------------------------------- | ------------------------------------ | ------------- |
| Prevent authed users | (auth)/+layout.server.ts                       | `resolveCurrentUser` → authenticated | 303 to /      |
| Require auth         | (app)/(private)/+layout.server.ts              | `currentUser` absent (from parent)    | 303 to /login |
| Require auth (profile tabs) | [username]/(private)/+layout.server.ts | `currentUser` absent (from parent)    | 303 to /login |

`(app)/+layout.server.ts` itself no longer redirects — it resolves
`currentUser: User | null` for every route under `(app)`, including the
anonymous-readable `/posts/{id}` and `/{username}` routes, and skips the
unread-count fetch entirely when there's no session. The `(private)` group
is where the hard require-auth boundary now lives, one level down.

`resolveCurrentUser(apiClient(event), hasSession)`:

1. Without a session cookie, returns `{ status: "unauthenticated" }`
   immediately with no backend call.
2. Otherwise calls `GET /sessions` → returns `currentSessionId` and `userId`.
3. Calls `GET /users/{userId}` → returns full user object.
4. On any failure: returns `{ status: "unauthenticated" }` or
   `{ status: "unavailable" }` — this no longer forces a redirect by itself;
   only the `(private)` layout guard redirects.

## Data Fetching Strategy

| Pattern                     | When used                                           |
| --------------------------- | --------------------------------------------------- |
| `+page.server.ts` `load`    | Initial page data — runs server-side only           |
| `+page.server.ts` `actions` | All mutations — form actions with `use:enhance`     |
| `+server.ts` `GET`          | Client-driven pagination "load more" — returns JSON |
| `createPagination<T>()`     | Client-side state for progressive list loading      |

No data is fetched on component mount. The browser never calls the backend
directly.

## SSR Boundary

Everything runs in the Node server. `apiClient(event)` resolves backend paths
against `BACKEND_URL` and forwards the session cookie. These are
server-to-server requests; they never cross CORS.

Browser-initiated fetches for pagination hit same-origin SvelteKit `+server.ts`
handlers, which call the backend server-side.

Backend-bound server requests use `BACKEND_TIMEOUT_MS` (default 10000 ms) as an
abort deadline.

Backend-authored error bodies are not UI copy. The shared backend response
unwrap helper preserves HTTP status for route control flow, but maps failed
responses to frontend-owned fallback messages instead of rendering backend
`message` fields, raw response text, status text, or exception details. Form
actions may choose more specific frontend-owned copy based on context and
status. Normal response data, including user-authored content, is rendered
unchanged after DTO mapping.

## Key Frontend Routes

| Path                    | Method | Handler         | Backend call                                                      |
| ----------------------- | ------ | --------------- | ----------------------------------------------------------------- |
| `/`                     | GET    | page load       | GET /posts/feed                                                   |
| `/`                     | GET    | +server.ts      | GET /posts/feed?cursor=                                           |
| `/{username}`           | GET    | page load       | GET /users?username= + GET /users/{id}/posts                      |
| `/{username}`           | GET    | +server.ts      | GET /users/{id}/posts?cursor=                                     |
| `/{username}/replies`   | GET    | page load       | GET /users/{id}/replies                                           |
| `/{username}/replies`   | GET    | +server.ts      | GET /users/{id}/replies?cursor=                                   |
| `/{username}/likes`     | GET    | page load       | GET /users/{id}/likes                                             |
| `/{username}/likes`     | GET    | +server.ts      | GET /users/{id}/likes?cursor=                                     |
| `/{username}/followers` | GET    | page load       | GET /users/{id}/followers                                         |
| `/{username}/followers` | GET    | +server.ts      | GET /users/{id}/followers?cursor=                                 |
| `/{username}/following` | GET    | page load       | GET /users/{id}/following                                         |
| `/{username}/following` | GET    | +server.ts      | GET /users/{id}/following?cursor=                                 |
| `/posts/{id}`           | GET    | page load       | GET /posts/{id} + GET /posts/{id}/replies                         |
| `/posts/{id}`           | GET    | +server.ts      | GET /posts/{id}/replies?cursor=                                   |
| `/search`               | GET    | page load       | GET /search?q=&type=all (or type=users for @ prefix) + GET /search/recent, or GET /hashtags/{tag}/posts for a # prefix |
| `/search`               | GET    | +server.ts      | GET /search?q=&type=&cursor= — backs pagination and users/hashtags typeahead; type=hashtag-posts calls GET /hashtags/{tag}/posts?cursor= directly |
| `/search/recent`        | POST/DELETE | +server.ts | POST /search/recent, DELETE /search/recent                         |
| `/search/recent/{id}`   | DELETE | +server.ts      | DELETE /search/recent/{id}                                         |
| `/notifications`        | GET    | app layout load | GET /notifications/unread-count                                   |
| `/notifications`        | GET    | page load       | GET /notifications                                                 |
| `/notifications`        | GET    | +server.ts      | GET /notifications?cursor=                                        |
| `/notifications`        | POST   | +server.ts      | PUT /notifications/{id}/read for unread rows, fired client-side on mount |
| `/uploads/{key}`        | GET    | +server.ts      | GET /uploads/{key} (proxied)                                      |
| `/health`               | GET    | +server.ts      | returns "ok"                                                      |

## Image Proxy

`GET /uploads/[key]` in `src/routes/uploads/[key]/+server.ts`:

- Validates `key` against `^[A-Za-z0-9._-]{1,255}$`; rejects keys containing
  `..` — 404 on failure.
- Accepts an optional `?size=thumb` query param and forwards it as-is; any
  other `size` value is rejected with 400.
- Streams response body from backend without buffering in the Node process.
- Does not attach a session cookie; backend image reads are public through the
  gateway.
- Forwards: `content-type`, `content-length`, `etag`, `last-modified`,
  `cache-control`.

`imageUrl(key, size?)` in `src/lib/shared/imageUrl.ts` builds this URL;
callers pass `"thumb"` for avatar renders (the derived thumbnail is a
128x128 cover-crop, which distorts badly at non-square aspect ratios) and
omit it for cover photos and full-resolution post media.

## Pagination

- Initial paginated data returned by `load` functions follows each page's
  existing prop names, with `nextCursor: string | null`.
- Subsequent pages: client calls the corresponding same-origin `+server.ts` GET
  route with `?cursor=`. Profile routes (`/{username}` and its tabs) also pass
  `&userId=`, since the initial `load` already resolved the profile user;
  `+server.ts` falls back to resolving by username only if `userId` is absent.
- `createPagination<T>()` state: `items`, `cursor`, `loading`. `more()` appends
  and advances cursor.
- Used in: feed, user posts, user replies, liked posts, followers, following,
  post detail replies, hashtag post feed (`/search?q=#tag`).
- The feed renders a first-page empty state linking to `/search` when
  `/posts/feed` returns no items and no cursor.
- `/notifications` marks unread rows as read via a same-origin POST fired
  once the page has actually mounted, never from `load` — a GET can never
  trigger the write, closing it off from speculative preloads. Pagination
  through same-origin `+server.ts` GET stays read-only.
- `/search` shows recent searches when the empty input is focused. Typing
  switches to a users/hashtags-only typeahead capped at 10 combined rows; Enter
  submits the typed query unless the user arrow-highlights a suggestion first.
  A `#tag` query (typed, submitted from a suggestion, or from clicking a
  hashtag in post content) shows that tag's exact post feed instead of the
  blended/typeahead results — a distinct `type=hashtag-posts` mode backed by
  `getHashtagPosts`, not the full-text hashtag-name search.
- The blended `type=all` results page groups the response client-side into a
  "People" and a "Posts" section (headers only render when that section is
  non-empty) and drops any `hashtags` items from the blend entirely — hashtag
  lookup stays a typeahead-only affordance, not a results-page entity type.
- The search box has a clear ("X") button once it has text; it only resets the
  input locally (clears typed text, no navigation) — the current results stay
  on screen. The `#tag` view has no separate heading — the search box itself
  (prefilled with the query) is the only place the current tag is shown.

## Image Upload Flow

1. User selects file in form.
2. Server action calls `uploadImage(api, file)` — `POST /uploads` (multipart,
   field name `image`).
3. Response: `{ filename: string }`.
4. `filename` used as `mediaKey` in subsequent `createPost` or `updateUser`
   request.

## Session Cookie Relay

The login action calls `POST /sessions` via `apiClient`. SvelteKit only
auto-propagates `Set-Cookie` for same-origin targets, and `BACKEND_URL` is a
cross-origin internal address, so `apiClient` parses each response's
`Set-Cookie` headers (via `set-cookie-parser`) and writes them onto
`event.cookies` itself. After redirect, `event.cookies.get("session")` is
non-null and `apiClient` includes it on subsequent calls as
`Cookie: session={value}`.

On logout:
`cookies.delete("session", { path: "/", httpOnly: true, sameSite: "strict" })`
clears the cookie on the SvelteKit origin regardless of backend response.

## Security Headers (hooks.server.ts)

Applied to all responses. No `Strict-Transport-Security`: this deployment has
no TLS termination (local k3s only).

| Header                     | Value                                                                      |
| --------------------------- | ---------------------------------------------------------------------------- |
| X-Content-Type-Options      | nosniff                                                                    |
| X-Frame-Options             | DENY                                                                       |
| Referrer-Policy             | strict-origin-when-cross-origin                                           |
| Cross-Origin-Opener-Policy  | same-origin                                                                |
| Permissions-Policy          | camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=() |

CSP: nonce-based, set by SvelteKit. See security.md for directives.
