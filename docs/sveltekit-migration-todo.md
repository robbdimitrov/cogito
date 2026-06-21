# Thoughts: Next.js/React → SvelteKit migration — execution todo

> Companion to the approved plan. Execute top-to-bottom. **Each `## Commit N` section is one
> commit** (single-line subject, ≤72 chars, no body/trailers — per `AGENTS.md`). Keep the build
> green at the end of every commit. Work in `apps/frontend-svelte/` until the final cutover commit
> renames it to `apps/frontend/`. This migration shares one best-practice architecture with the
> pixelgram Angular→SvelteKit migration (`../pixelgram/docs/sveltekit-migration-todo.md`); only the
> business domains differ.

## Ground rules (read first)

- Stack is **fixed**: SvelteKit 2 + Svelte 5 (runes), TypeScript strict, Vite,
  `@sveltejs/adapter-node`, **Tailwind v4 (CSS-first) + DaisyUI v5**, `@lucide/svelte`. **Do not
  add any other runtime dependency** without explicit approval.
- **Native `fetch` only.** No axios/ky. Domain `*.server.ts` API functions take a `fetch` arg; **always
  pass `event.fetch`** (from `load`/actions/endpoints). The client is **imported server-only**;
  the browser never imports it.
- **BFF data-flow rule (non-negotiable):** reads → `+page.server.ts` `load`; writes → form actions
  in `+page.server.ts` (click-style mutations like/repost/follow/delete are
  `<form method="POST" use:enhance>` mini-forms, **not** `fetch` in `onclick`); client-driven
  "load more" and `@mention` typeahead → a purposeful per-list `+server.ts` GET returning JSON.
  **No generic `/api` proxy. No fetch-on-mount in components.** The browser only ever hits
  intentional SvelteKit routes (CSP `connect-src 'self'`).
- **Image bytes are the one browser→backend exception:** served from a clean same-origin
  **`/uploads/{key}`** path routed by the **Ingress directly to the backend** (the Go gateway
  already serves `GET /uploads/{filename}`, `apigateway/api/router.go:97` — no rewrite needed),
  never through the Node process. CSP `img-src 'self'`. The `imageUrl` helper emits `/uploads/{key}`.
- Principles: KISS / DRY / SOLID / clean, self-documenting code. Prefer native SvelteKit
  primitives over porting React machinery (no Context-as-DI, no client API singleton, no
  `router.refresh()`, no `useActionState`/`useEffect` ceremony).
- Preserve behavior and public routes 1:1, but organize implementation by business domain:
  `src/lib/domains/{auth,posts,users,settings}` owns its components, models, validation, and
  server API functions. `src/lib/shared` is only for code used by multiple domains (layout/UI,
  transport response handling, image processing, and generic formatting). Route files remain thin
  SvelteKit adapters that compose domain functions. Domains must not import another domain's
  private modules; promote a dependency to `shared` only when it is genuinely cross-domain.
- API resilience: tolerate `204 No Content` and non-JSON error bodies — never call
  `response.json()` unconditionally.
- Backend is **untouched**. Same un-prefixed contract (`/sessions`, `/posts`, `/users`,
  `/uploads`, `/hashtags` — verified `apigateway/api/router.go:64-97`); `handleFetch` strips `/api`.
- Reference React source under `apps/frontend/src/` for exact behavior/markup when porting
  (`shared/services/apiclient.ts`, `serverapi.ts`, `proxy.ts`, `shared/components/**`,
  `app/createpost.tsx`, `app/[username]/**`, `app/settings/**`).
- After each commit: `npm run lint` + `svelte-check` clean before moving on.

---

## Commit 1 — Scaffold project + tooling

`chore: scaffold sveltekit frontend with tailwind/daisyui`

- [x] Scaffold SvelteKit (Skeleton, TypeScript) into `apps/frontend-svelte`.
- [x] Install + configure `@sveltejs/adapter-node` in `svelte.config.js`.
- [x] Add **Tailwind v4** via `@tailwindcss/vite`; add DaisyUI v5. Port the light/dark theme and
      glass-morphism tokens from `apps/frontend/tailwind.config.js` + `shared/components/ui/surface.tsx`
      into `src/app.css` (`@import 'tailwindcss'; @plugin 'daisyui'`, `@theme`, `@utility`).
- [x] Add `@lucide/svelte`. Verify a single-icon import tree-shakes.
- [x] `tsconfig`: strict, `noUncheckedIndexedAccess`, no implicit any.
- [x] ESLint + Prettier (Svelte plugins). `npm run lint` and `svelte-check` pass on skeleton.
- [x] `src/app.html`: base document, `data-theme` placeholder on `<html>`.
- **Done when**: `npm run dev` serves a blank page; lint + check clean; `npm run build` produces a
  `build/` runnable with `node build`.

## Commit 2 — Domain models + shared utils

`feat: port shared types and utility functions`

- [x] Domain models: `domains/users/model.ts` (`User`), `domains/posts/model.ts` (`Post`, incl.
      `repostOf`/`quotePost`/`inReplyToId`/`quoteOfId`/`mediaKey`/`replies`/`liked`/`reposted`),
      and `domains/auth/model.ts` (`Session`). Port from `shared/types/index.ts`.
- [x] `src/lib/shared/image.ts`: port **verbatim** from `shared/utils/image.ts` (Canvas/Blob/File;
      max 1600px, ~900KB, JPEG quality floor).
- [x] `domains/posts/format.ts`: link / `#hashtag` / `@mention` parsing (port
      `formattedcontent.tsx`).
- [x] `src/lib/shared/imageUrl.ts`: returns **`/uploads/${key}`**.
- [x] `src/lib/shared/mappers.ts` (or `camelizeKeys`) for DTO→model. Port `apiclient.ts` camelize.
- **Done when**: utils unit-importable; no Svelte/React coupling; check clean.

## Commit 3 — Typed API client (native fetch, server-only)

`feat: add typed api client`

- [x] `src/lib/domains/auth/api.server.ts`: `login` (POST `/api/sessions`), `logout` (DELETE),
      `getSessions` (→ `{sessions, currentSessionId}`), `deleteSession`.
- [x] `src/lib/domains/users/api.server.ts`: `createUser`, `updateUser`, `updatePassword`, `getUser`,
      `getByUsername`, `searchUsers`, `getFollowing`/`getFollowers` (page), `follow`/`unfollow`.
- [x] `src/lib/domains/posts/api.server.ts`: feed / user-posts / liked / hashtag (page), `getPost`,
      `getReplies`, `create` (content, mediaKey, inReplyToId, quoteOfId), `delete`,
      `like`/`unlike`, `repost`/`removeRepost`.
- [x] `src/lib/domains/posts/uploads.server.ts`: `uploadImage` (multipart → `{key}`).
- [x] Each fn signature `(fetch, ...args)`; central response handler tolerating 204 + non-JSON
      errors; typed returns. Mirror the endpoint set in `shared/services/apiclient.ts`.
- [x] Put the central response handler in `src/lib/shared/transport.server.ts`; keep all server
      modules named `*.server.ts` so backend transport never ships to the client.
- **Done when**: every endpoint typed and reused from one place (DRY); check clean.

## Commit 4 — SSR hooks, security, env (no generic proxy)

`feat: add ssr hooks and security headers`

Replaces `apps/frontend/src/proxy.ts` + `app/api/[...path]/route.ts`. **No `/api/[...path]`
passthrough** — all backend access is server-mediated (BFF). The browser never calls `/api`.

- [x] `src/hooks.server.ts`:
  - [x] `handleFetch`: rewrite `/api/*` → `${BACKEND_URL}/*`, forward inbound `Cookie`, and for
        mutating methods set `X-CSRF-Token` from the `_csrf` cookie. This is how
        `load`/actions/endpoints reach the Go gateway (replaces `serverapi.fetchServer`).
  - [x] `handle`: set `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`,
        `Referrer-Policy: strict-origin-when-cross-origin` on every response.
  - [x] CSP itself lives in `svelte.config.js` `kit.csp` (`mode: 'nonce'`, SvelteKit injects the
        nonce). Port directives from `next.config.mjs` (`connect-src 'self'`, `img-src 'self' data:`,
        etc.) — see Appendix B.
  - [x] `handleError`: server-side logging.
- [x] `src/routes/health/+server.ts`: returns `ok`.
- [x] Env via `$env/dynamic/private` (`BACKEND_URL`) — never `$env/static/*`.
- **Done when**: a server-side `load` calling a domain server function via `event.fetch` reaches the
  gateway; CSP header carries a per-request nonce; security headers present; `/health` ok.

## Commit 5 — Theme (SSR, no FOUC)

`feat: add ssr theme handling via cookie`

- [x] `src/routes/+layout.server.ts`: read `theme` cookie, expose to layout.
- [x] Root `+layout.svelte`: apply `data-theme` from server data (no FOUC).
- [x] Theme rune/store: toggle writes `theme` cookie (`max-age=31536000; samesite=lax`) +
      `localStorage`. Port `shared/hooks/usetheme.ts` semantics (system/light/dark).
- **Done when**: theme persists across reload with no flash; SSR matches client.

## Commit 6 — App shell + auth guard + navbar

`feat: add app shell with session guard and navbar`

- [x] `src/routes/(app)/+layout.server.ts`: resolve `currentUser` (validate `/sessions` → fetch
      `/users/{id}`); `throw redirect(303, '/login')` when unauthenticated. Replaces `proxy.ts`
      guard + `serverapi.getCurrentUser`. Expose `currentUser` via layout data.
- [x] `(auth)` group layout (no guard) for login/signup.
- [x] `src/lib/shared/components/layout/Navbar.svelte` (port `shared/components/navbar`), theme toggle,
      user dropdown, logout; driven by `$page.data.currentUser`; lucide icons.
- [x] Toast provider via context + rune (port `shared/components/toast`); `Avatar`, `GlassCard`/
      `Field`/`FormInput`/`IconInput`, `ConfirmModal`, `Loading`, `+error.svelte`. Replace
      `surface.tsx` class helpers with shared Tailwind utilities. Keep these under
      `src/lib/shared/components/ui`.
- **Done when**: unauthenticated hits redirect to `/login`; authed shell renders navbar + toast.

## Commit 7 — Auth domain (login + signup)

`feat: add login and signup with form actions`

- [ ] `(auth)/login/+page.svelte` + `+page.server.ts` action → `login`. **Capture the backend
      `Set-Cookie` from the `event.fetch` response and re-emit via `cookies.set`.** Verify the
      `session` cookie lands in the browser — #1 silent breakage.
- [ ] `(auth)/signup/+page.svelte` + action → `createUser` then `login`.
- [ ] Logout action → `logout` + `cookies.delete`; idempotent.
- [ ] `bind:value`, server-side validation, progressive enhancement; keep SvelteKit CSRF on.
      Port markup/validation from `app/login/login.tsx`, `app/signup/signup.tsx`, `auth/authhero.tsx`.
- **Done when**: signup → logged-in session → refresh stays authed → logout clears session, all
  verified in the browser (cookie present).

## Commit 8 — Route param matchers

`feat: add route param matchers`

- [ ] `src/params/username.ts`: bare-username pattern — verify against `app/[username]/routeutils.ts`.
- [ ] `src/params/tab.ts`: match `likes|followers|following`.
- [ ] Junk segments must fall through to 404 (`/garbage!!` must not route to profile).
- **Done when**: `/someuser` matches, junk does not route to profile.

## Commit 9 — Posts: feed + single post + replies

`feat: add feed, single post and replies`

- [ ] `src/lib/shared/createPagination.svelte.ts`: reusable **page-based** pagination rune; used by
      feed/profile/likes/hashtag/replies (DRY). "Load more" fetches `?page=` from a purposeful
      `+server.ts` GET, not a generic proxy.
- [ ] `(app)/(main)/+page.server.ts` (`load` first page via `event.fetch`) + `+page.svelte`;
      `(app)/(main)/+server.ts` GET `?page=` → next page JSON for "load more".
- [ ] `(app)/posts/[id]/+page.server.ts` + `+page.svelte` (single post + replies + composer).
      like/unlike, repost/removeRepost, delete, reply-create as named **form actions** here.
- [ ] `src/lib/domains/posts/components/`: `PostList`, `PostItem`, `QuoteEmbed`, `FormattedContent`,
      `ReplyComposer`, `RepostMenu`, `QuoteComposeModal` (port `shared/components/postlist/**`,
      `repostmenu/**`, `replycomposer/**`, `postcontent/**`). like/repost/delete as
      `<form use:enhance>` mini-forms → named actions; **optimistic UI in the enhance callback**
      (preserve "skip full refetch", commit `2470924`).
- [ ] `loading="lazy"` + width/height on images (CLS, lazy list images).
- **Done when**: feed paginates (load-more endpoint), single post + replies load, like + repost +
  reply round-trip works with progressive enhancement.

## Commit 10 — Posts: create + upload + mention typeahead

`feat: add post creation and upload`

- [ ] `(app)` composer (port `app/createpost.tsx`): client resize via `shared/image.ts` in the browser,
      then submit the resized blob in a `<form use:enhance>` → `+page.server.ts` action that calls
      `uploadImage` (multipart via `event.fetch`) then `create` (with `inReplyToId`/`quoteOfId`).
- [ ] `@mention` typeahead → purposeful `+server.ts` GET (`searchUsers`, debounced client-side).
- **Done when**: compose → resize → upload → post appears in feed; mention autocomplete works.

## Commit 11 — Users: profile + connections + hashtags

`feat: add profile, connections and hashtags`

- [ ] `(app)/[username=username]/+page.server.ts` (`load` profile + first posts page; follow/
      unfollow named actions) + `+page.svelte`; `+server.ts` GET for posts "load more".
- [ ] Tabs `likes`/`followers`/`following` (`[tab=tab]`) with per-list `load` + `+server.ts`
      load-more. Port `app/[username]/_components/**` (`userheader`, `controlbar`, `userlist`,
      `useritem`) + `app/usercard.tsx`.
- [ ] `(app)/hashtags/[tag]/+page.server.ts` + `+page.svelte` + load-more (port `hashtagfeed.tsx`).
- **Done when**: profile, posts, likes, followers/following, follow/unfollow, hashtag feed all work.

## Commit 12 — Users: settings (incl. sessions)

`feat: add settings, profile, password and sessions`

- [ ] `(app)/settings/+layout.svelte` + nested panels: index, `profile`, `password`, `sessions`.
- [ ] Edit-profile (avatar + cover resize via `shared/image.ts`), change-password, and **active sessions**
      list + revoke — all as form actions. Port `app/settings/_components/**`.
- **Done when**: profile edits + password change persist after reload; sessions list + revoke work.

## Commit 13 — Errors, 404, SEO, loading UX

`feat: add error pages, seo meta and loading states`

- [ ] `src/routes/+error.svelte` + catch-all not-found.
- [ ] 401 from `load`/actions → `redirect(303, '/login')`.
- [ ] Per-page `<svelte:head>` title + OG tags (profile/post); replaces `usedocumenttitle`.
- [ ] `$navigating`-driven pending indicators; optional `load` streaming for below-the-fold lists.
- **Done when**: bad URLs 404, 401s redirect, pages have titles, nav shows pending state.

## Commit 14 — Tests (high-value 20%)

`test: add vitest coverage for critical paths`

- [ ] Vitest + `@testing-library/svelte` (dev deps).
- [ ] Cover: auth flow, pagination rune, `image.ts` resize, API-client 204/non-JSON handling,
      `format.ts` parsing, signup validation. Port intent from existing React test suite.
- **Done when**: `make test` (or `npm test`) green; covers the critical paths only.

## Commit 15 — Docker + deploy wiring

`build: dockerize sveltekit frontend and update deploy`

- [ ] `apps/frontend-svelte/Dockerfile`: multi-stage build → `node build` (node:slim, **not**
      scratch); uid 1000, `readOnlyRootFilesystem`, port 8080. `.dockerignore`.
- [ ] **adapter-node env** in `deploy/frontend.yaml`: `ORIGIN` (or `PROTOCOL_HEADER=
      x-forwarded-proto` + `HOST_HEADER=x-forwarded-host`) and `ADDRESS_HEADER=x-forwarded-for` —
      required for correct URLs + form-action CSRF behind ingress. Keep `BACKEND_URL`/`API_URL`,
      `PORT` 8080, health `/health`.
- [ ] **Ingress** (`deploy/frontend.yaml:59-74`): add `/uploads` prefix rule → `apigateway:8080`
      (image bytes, no rewrite) **before** the `/` rule.
- [ ] Update `Makefile` `frontend` target (build the new dir).
- **Done when**: `make frontend` builds; `./scripts/deploy.sh` runs; port-forward/ingress smoke
  test (signup → upload → feed → like → repost → reply → follow → profile → settings → logout) passes.

## Commit 16 — Cutover: remove Next.js, rename, docs

`refactor: replace nextjs frontend with sveltekit`

- [ ] Verify full parity (Commit 15 smoke test) first.
- [ ] Delete old `apps/frontend` (Next.js); **rename `apps/frontend-svelte` → `apps/frontend`**.
- [ ] Fix any path references (Makefile, Dockerfile paths, deploy, scripts).
- [ ] Update `AGENTS.md` frontend rows: Next.js→SvelteKit; `src/app/`→`src/routes/`; replace the
      `/api` proxy + `proxy.ts` guidance with the BFF model (`handleFetch`, form actions,
      `/uploads` image edge route); theme cookie; dev commands.
- **Done when**: repo builds/deploys from `apps/frontend`; AGENTS.md accurate; no Next.js left.

---

## Final verification checklist

- [ ] `npm run lint` + `svelte-check` clean.
- [ ] `make test` green.
- [ ] Prod build (`node build`) with `BACKEND_URL` set: SSR auth works (cookie forwarded, authed
      first paint), no theme FOUC, CSP nonce present + `connect-src 'self'` + `img-src 'self'`,
      security headers present, multipart upload works via action, `/health` ok, and **no browser
      request hits `/api/*`** for data (verify in devtools) — images load from `/uploads/*`.
- [ ] kind end-to-end smoke test passes (signup → upload → feed → like → repost → reply → quote →
      follow → profile → tabs → hashtag → settings/sessions → logout; guard redirects both ways;
      backend-down does not log out).
- [ ] Dependency list contains only: svelte, @sveltejs/kit, adapter-node, vite, tailwindcss,
      @tailwindcss/vite, daisyui, @lucide/svelte (+ dev: eslint/prettier/svelte-check/vitest/
      testing-library).

---

## Appendix A — Reference map (React source → SvelteKit target)

All source paths are under `apps/frontend/src/`; all targets under `apps/frontend-svelte/src/`.

| React source | SvelteKit target | Notes |
|---|---|---|
| `proxy.ts` | `hooks.server.ts` (`handle` guard) + `(app)/+layout.server.ts` | guard once; layout reads result |
| `app/api/[...path]/route.ts` | **deleted** | replaced by `handleFetch` + `/uploads` ingress route |
| `shared/services/serverapi.ts` | `hooks.server.ts` `handleFetch` + domain `*.server.ts` modules | cookie forwarding centralized |
| `shared/services/apiclient.ts` | `lib/domains/{auth,users,posts}/api.server.ts` | server-only; `(fetch, ...args)` |
| `shared/services/session.ts` + `contexts/apicontext.tsx` | **deleted** | no client singleton/Context (BFF) |
| `shared/types/index.ts` | `lib/domains/{auth,users,posts}/model.ts` | split by model ownership |
| `shared/utils/image.ts` | `lib/shared/image.ts` | port **verbatim** (browser-only) |
| `shared/components/postcontent/formattedcontent.tsx` | `lib/domains/posts/format.ts` + `lib/domains/posts/components/FormattedContent.svelte` | |
| `shared/hooks/usetheme.ts` | `lib/shared/theme.svelte.ts` + `+layout.server.ts` cookie | SSR `data-theme` |
| `shared/hooks/usedocumenttitle.ts` | **deleted** | use `<svelte:head><title>` |
| `shared/components/ui/surface.tsx` | `lib/components/ui/*` + class constants in `app.css` | glass tokens → `@utility` |
| `shared/components/{navbar,toast,avatar,loading,errorboundary,auth}/*` | `lib/components/{layout,ui}/*` | |
| `shared/components/postlist/*`, `repostmenu/*`, `replycomposer/*` | `lib/domains/posts/components/*` | |
| `app/(main)/page.tsx`, `feed.tsx`, `feedskeleton.tsx` | `routes/(app)/(main)/+page.{server.ts,svelte}` + `+server.ts` | |
| `app/login/*`, `app/signup/*` | `routes/(auth)/{login,signup}/+page.{server.ts,svelte}` | form actions |
| `app/[username]/**` (+ `_components`, `routeutils.ts`) | `routes/(app)/[username=username]/**` + `params/username.ts` | |
| `app/posts/[id]/*` | `routes/(app)/posts/[id]/+page.{server.ts,svelte}` | |
| `app/hashtags/[tag]/*` | `routes/(app)/hashtags/[tag]/+page.{server.ts,svelte}` | |
| `app/settings/**` | `routes/(app)/settings/**` | profile/password/sessions panels |
| `app/createpost.tsx`, `usercard.tsx` | `lib/domains/posts/components/CreatePost.svelte`, `lib/domains/users/components/UserCard.svelte` | |

## Appendix B — Exact values to preserve (do not re-invent)

- **API contract** (un-prefixed at gateway; client uses `/api` + `handleFetch` strips it). From
  `apiclient.ts`: `POST/GET/DELETE /sessions`, `DELETE /sessions/{id}`; `POST/GET /users`,
  `GET /users/search?q=&limit=`, `GET/PUT /users/{id}`, `GET/POST/DELETE /users/{id}/following`,
  `GET /users/{id}/followers`, `GET /users/{id}/{posts,likes}?page=`; `POST/GET /posts`,
  `GET /posts/feed?page=`, `GET/DELETE /posts/{id}`, `GET /posts/{id}/replies?page=`,
  `POST/DELETE /posts/{id}/{likes,reposts}`, `GET /hashtags/{tag}/posts?page=`; `POST /uploads`
  (multipart field `image`, returns `{filename}` → expose as `{key}`).
- **`createPost` body:** `{content, mediaKey, inReplyToId?, quoteOfId?}` — coerce reply/quote ids
  with `Number(...)` (gateway expects numbers).
- **Signup validation** (`signup.tsx`): username `^[a-zA-Z0-9_]+$`; password length ≥ 8. Disable
  submit until valid. Signup = `createUser` then `login`.
- **Username normalization** (`routeutils.ts`): `decodeURIComponent(username).replace(/^@/, '')`.
  Profile links are bare `username`; the matcher rejects junk so it 404s.
- **CSP directives** (`next.config.mjs`): `default-src 'self'`; `script-src 'self'` (nonce, drop
  `unsafe-inline`/`unsafe-eval` — SvelteKit doesn't need them); `style-src 'self' 'unsafe-inline'`;
  `img-src 'self' data:`; `font-src 'self'`; `connect-src 'self'`; `object-src 'none'`;
  `frame-ancestors 'self'`; `base-uri 'self'`; `form-action 'self'`.
- **Image resize** (`image.ts`, port verbatim): allowed `image/{jpeg,png,gif,webp}`; skip if
  ≤ 900 KB; max side 1600 px; quality 0.88 → 0.59 step 0.08, then scale ×0.85, floor 320 px; white
  background fill; output `.jpeg`. Runs in the **browser** before the upload form submits.
- **401 handling:** `load`/actions treat 401 as `redirect(303, '/login')`. **Backend-down (5xx/
  network) must NOT log out** — let the request through, keep the cookie (port `proxy.ts` intent).
- **camelize:** gateway returns snake_case; convert to camelCase in the api layer (port
  `camelizeKeys` from `apiclient.ts`), or map DTOs explicitly.

## Appendix C — SvelteKit recipes (copy-paste starting points)

```ts
// src/hooks.server.ts — server↔backend transport + security headers
import type { Handle, HandleFetch } from '@sveltejs/kit';
import { env } from '$env/dynamic/private';
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const handleFetch: HandleFetch = async ({ request, fetch, event }) => {
  if (request.url.startsWith(`${event.url.origin}/api/`)) {
    const target = request.url.replace(`${event.url.origin}/api`, env.BACKEND_URL);
    const headers = new Headers(request.headers);
    headers.set('cookie', event.request.headers.get('cookie') ?? '');
    if (MUTATING.has(request.method)) {
      const csrf = event.cookies.get('_csrf');
      if (csrf) headers.set('x-csrf-token', csrf);
    }
    request = new Request(target, new Request(request, { headers }));
  }
  return fetch(request);
};

export const handle: Handle = async ({ event, resolve }) => {
  const res = await resolve(event);
  res.headers.set('X-Content-Type-Options', 'nosniff');
  res.headers.set('X-Frame-Options', 'SAMEORIGIN');
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  return res;
};
```

```ts
// src/lib/domains/posts/api.server.ts — server-only api fn shape: always (fetch, ...args)
import { error } from '@sveltejs/kit';
import type { Post } from './model';
type Fetch = typeof globalThis.fetch;

async function unwrap<T>(res: Response): Promise<T | null> {
  if (res.status === 204) return null;
  if (!res.ok) throw error(res.status, await res.text().catch(() => '') || `HTTP ${res.status}`);
  const text = await res.text();
  return text ? (camelize(JSON.parse(text)) as T) : null;   // tolerate empty/non-JSON
}
export const getFeed = (fetch: Fetch, page: number) =>
  fetch(`/api/posts/feed?page=${page}`).then((r) => unwrap<{ items: Post[] }>(r));
export const likePost = (fetch: Fetch, id: string) =>
  fetch(`/api/posts/${id}/likes`, { method: 'POST' }).then((r) => unwrap<void>(r));
```

```ts
// src/routes/(app)/(main)/+page.server.ts  — reads via load
import { getFeed } from '$lib/domains/posts/api.server';
export const load = async ({ fetch }) => ({ feed: (await getFeed(fetch, 0))?.items ?? [] });
```
```ts
// src/routes/(app)/(main)/+server.ts  — purposeful "load more" endpoint (NOT a generic proxy)
import { json } from '@sveltejs/kit';
import { getFeed } from '$lib/domains/posts/api.server';
export const GET = async ({ fetch, url }) =>
  json((await getFeed(fetch, Number(url.searchParams.get('page') ?? '0')))?.items ?? []);
```

```ts
// src/routes/(auth)/login/+page.server.ts — form action; GOTCHA: re-emit backend Set-Cookie
import { fail, redirect } from '@sveltejs/kit';
import { parse as parseSetCookie } from 'set-cookie-parser';   // tiny, or hand-parse name=value
export const actions = {
  default: async ({ request, fetch, cookies }) => {
    const data = await request.formData();
    const res = await fetch('/api/sessions', {
      method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: data.get('email'), password: data.get('password') }),
    });
    if (!res.ok) return fail(res.status, { error: 'Invalid email or password' });
    // handleFetch rewrites to BACKEND_URL (cross-origin) → Set-Cookie is NOT auto-applied.
    for (const c of parseSetCookie(res.headers.get('set-cookie') ?? '', { map: false }))
      cookies.set(c.name, c.value, { path: '/', httpOnly: true, sameSite: 'lax', secure: true, maxAge: c.maxAge });
    throw redirect(303, '/');
  },
};
```

```svelte
<!-- src/lib/domains/posts/components/LikeButton.svelte — mini-form, optimistic, no refetch -->
<script lang="ts">
  import { enhance } from '$app/forms';
  let { post } = $props();
  let liked = $state(post.liked); let likes = $state(post.likes);
</script>
<form method="POST" action="?/toggleLike" use:enhance={() => {
  const prev = { liked, likes };
  liked = !liked; likes += liked ? 1 : -1;                       // optimistic
  return async ({ result, update }) => {
    if (result.type === 'failure') { liked = prev.liked; likes = prev.likes; }  // rollback
    else await update({ invalidateAll: false });                 // preserve "skip full refetch"
  };
}}>
  <input type="hidden" name="postId" value={post.id} />
  <button class:liked>{likes}</button>
</form>
```

```ts
// src/lib/shared/createPagination.svelte.ts — reusable page-based pagination rune
export function createPagination<T>(initial: T[], fetchPage: (page: number) => Promise<T[]>) {
  let items = $state(initial), page = $state(0), loading = $state(false);
  let done = $state(initial.length === 0);
  async function more() {
    if (loading || done) return;
    loading = true;
    const next = await fetchPage(page + 1); page += 1;
    next.length ? (items = [...items, ...next]) : (done = true);
    loading = false;
  }
  return { get items() { return items; }, get done() { return done; }, get loading() { return loading; }, more };
}
```

```yaml
# deploy/frontend.yaml — add the /uploads image route BEFORE the "/" rule
- path: /uploads
  pathType: Prefix
  backend:
    service:
      name: apigateway
      port:
        number: 8080
```

```
# Per-commit dev loop (run from apps/frontend-svelte)
npm run dev            # gateway must be reachable at $BACKEND_URL (port-forward apigateway)
npx svelte-check       # types
npm run lint           # eslint + prettier
npm run test           # vitest (from Commit 14 on)
node build             # adapter-node prod bundle (Commit 1 onward must stay runnable)
```
