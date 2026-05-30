# Thoughts Project — Assessment & Minimum Work Plan

## Executive Summary

The project is a microservices-based social app ("Thoughts") with a React frontend, Go API gateway, and gRPC backends (Go + Python). **The core backend architecture is sound**, but the frontend-to-backend integration is broken in several critical ways that prevent login, posting, and profile viewing from working end-to-end. The UI is built with custom SCSS and is inconsistent.

**Minimum viable goal:** Working login, posting thoughts, viewing profiles, with a consistent DaisyUI + Tailwind CSS interface supporting light/dark themes.

---

## 1. Discovery — What's Broken

### 1.1 Backend API Gateway — Body Parsing Mismatch (CRITICAL)

**Problem:** All API Gateway controllers (`auth_controller.go`, `user_controller.go`, `post_controller.go`) read request bodies using `c.FormValue("field")`. The frontend `APIClient` sends `Content-Type: application/json` bodies via `fetch`.

**Impact:** Every mutating request (login, signup, create post, update profile, update password) submits data the backend cannot parse. Empty strings are forwarded to gRPC services, causing validation errors or silent failures.

**Affected endpoints:**
- `POST /sessions` (login) → email/password empty
- `POST /users` (signup) → all fields empty
- `POST /posts` (create thought) → content empty
- `PUT /users/:userId` (update profile/password) → all fields empty

**Files to fix:** `src/apigateway/api/auth_controller.go`, `user_controller.go`, `post_controller.go`

### 1.2 Backend API Gateway — Missing Default Query Params (CRITICAL)

**Problem:** Controllers for feed, posts, likes, followers, and following require both `page` and `limit` query parameters and return `400 Bad Request` if either is missing.

**Impact:** The frontend only sends `page` (e.g., `/api/posts/feed?page=0`), so all paginated list endpoints fail.

**Affected endpoints:**
- `GET /posts/feed`
- `GET /users/:userId/posts`
- `GET /users/:userId/likes`
- `GET /users/:userId/following`
- `GET /users/:userId/followers`

**Files to fix:** `src/apigateway/api/post_controller.go`, `user_controller.go`

### 1.3 Frontend — Missing Cookie Credentials (CRITICAL)

**Problem:** The `APIClient.request()` method uses `fetch()` without `credentials: 'include'`. The API gateway sets an HttpOnly `session` cookie on login, but the browser never sends it back on subsequent requests.

**Impact:** After login, all authenticated API calls fail with `401 Unauthorized` because the authGuard cannot validate the session. The frontend only appears to work because it stores `userId` in `localStorage` and uses that for its own routing guards, while the actual API is rejecting every call.

**File to fix:** `src/frontend/src/shared/services/apiclient.js`

---

## 2. API Gateway Route Audit — Frontend Coverage

The gateway exposes 19 routes. Here is the status of each one:

| Method | Path | Backend Status | Frontend Status | Issue |
|--------|------|---------------|-----------------|-------|
| `POST` | `/users` | Works (gRPC) | Signup form exists | **Broken:** Reads `FormValue`, frontend sends JSON |
| `GET`  | `/users` | Works (gRPC) | Used for profile lookup | **Broken:** Reads `FormValue` (this one is actually query param, not body - still works since it's query-based) |
| `GET`  | `/users/:userId` | Works (gRPC) | Used in `refreshUser` | Works |
| `PUT`  | `/users/:userId` | Works (gRPC) | Settings forms exist | **Broken:** Reads `FormValue`, frontend sends JSON |
| `GET`  | `/users/:userId/following` | Works (gRPC) | Profile `/following` tab | **Broken:** Missing `limit` query param |
| `GET`  | `/users/:userId/followers` | Works (gRPC) | Profile `/followers` tab | **Broken:** Missing `limit` query param |
| `POST` | `/users/:userId/following` | Works (gRPC) | Button exists but **no click handler** |
| `DELETE`| `/users/:userId/following` | Works (gRPC) | Button exists but **no click handler** |
| `POST` | `/sessions` | Works (gRPC) | Login form exists | **Broken:** Reads `FormValue`, frontend sends JSON |
| `DELETE`| `/sessions` | Works (gRPC) | Logout dropdown item | Works |
| `POST` | `/posts` | Works (gRPC) | **No UI exists** |
| `GET`  | `/posts` | Works (gRPC) | Feed route | **Broken:** Missing `limit` query param |
| `GET`  | `/posts/feed` | Works (gRPC) | Feed route | **Broken:** Missing `limit` query param |
| `GET`  | `/users/:userId/posts` | Works (gRPC) | Profile posts tab | **Broken:** Missing `limit` query param |
| `GET`  | `/users/:userId/likes` | Works (gRPC) | Profile likes tab | **Broken:** Missing `limit` query param |
| `GET`  | `/posts/:postId` | Works (gRPC) | **No route, no component** |
| `DELETE`| `/posts/:postId` | Works (gRPC) | **No delete button anywhere** |
| `POST` | `/posts/:postId/likes` | Works (gRPC) | Like button exists | Works (after cookie fix) |
| `DELETE`| `/posts/:postId/likes` | Works (gRPC) | Unlike button exists | Works (after cookie fix) |
| `POST` | `/posts/:postId/reposts` | Works (gRPC) | Repost button exists | Works (after cookie fix), but field name bug `retweets` vs `reposts` |
| `DELETE`| `/posts/:postId/reposts` | Works (gRPC) | Remove repost button exists | Works (after cookie fix) |

### 2.1 Sessions & Authentication Gaps

**No session validation endpoint:** `validateSession` is called internally by `authGuard`, but there is no `GET /sessions` or `/me` endpoint. The frontend relies entirely on `localStorage.getItem('userId')` to know if you're logged in. If the cookie expires or is deleted, the frontend stays in a broken "logged in" state where every API call returns `401`.

**No 401 interceptor:** The `APIClient` doesn't check for `401` responses. When a session expires mid-use, the user sees silent failures (empty feeds, broken likes) instead of being redirected to `/login`.

**Disconnect between `localStorage` and cookies:** Login writes both a cookie and `localStorage.setItem('userId', ...)`. Logout clears both. But if the cookie expires while `localStorage` still has a value, the app is in a broken state.

### 2.2 Settings Gaps

The Settings page exists with two sub-pages:
- **Edit Profile** — Form exists but doesn't work (FormValue mismatch)
- **Change Password** — Form exists but doesn't work (FormValue mismatch)

Missing features (not required for MVP):
- Account deletion
- Avatar upload
- Email verification
- Privacy toggles

### 2.3 Follow/Unfollow — Half-Baked

`UserHeader` (on profile pages) and `UserItem` (in user lists) both render a "Follow" button, but:
- There is **no `onClick` handler** wired to `apiClient`
- The button is hardcoded to "Follow" — no conditional state for "Following" or "Unfollow"
- `UserItem` links to `/${user.username}` instead of `/@${user.username}`, so clicking a user from a list navigates to a non-matching route

### 2.4 Frontend Display Bugs

- **`UserCard`** references `user.thoughts` but the API returns `posts`. The counter on the feed sidebar shows blank.
- **`UserHeader`** hardcodes "Joined March 2011" and ignores `user.created`. It always shows "Follow" even when viewing your own profile (no "Edit Profile" switch).
- **`ThoughtItem`** references `post.retweets` but the API returns `reposts`. The repost count label is blank.

---

## 3. What Actually Works

- **Database schema:** Clean, correct, supports users, sessions, posts, likes, reposts, followers.
- **gRPC service implementations:** Auth, User, and Post services have correct business logic, password hashing, validation, and DB queries.
- **Kubernetes manifests:** Correctly structured with unique `component` labels, `imagePullPolicy: IfNotPresent`, and service discovery.
- **Docker builds:** Multi-stage Dockerfiles are present. Frontend uses `node:22-alpine` compatible with React-Scripts 5 and Webpack 5.
- **API Gateway routing:** Echo routes are correctly mapped to gRPC backends.
- **Session management (backend):** Cookies are HttpOnly, SameSite=Strict, 7-day expiry. Logout clears cookies.
- **Like/Repost actions (frontend wiring):** Buttons exist in `ThoughtItem` and handlers are wired in `app.js`. They work once the cookie issue is fixed.

---

## 4. Minimum Work Plan

### Phase A — Backend fixes (1–2 hours)

These are small, targeted fixes that unblock the frontend.

| # | Task | File(s) | Rationale |
|---|------|---------|-----------|
| A1 | Replace `c.FormValue(...)` with JSON body parsing in all controllers | `src/apigateway/api/auth_controller.go`, `user_controller.go`, `post_controller.go` | Unblocks login, signup, posting, profile updates |
| A2 | Add default `limit=20` when query param is missing | `post_controller.go`, `user_controller.go` | Unblocks feed, profile posts, likes, followers lists |
| A3 | Verify Go builds and Docker builds | `src/apigateway`, `src/postservice` | Ensure no regression |

### Phase B — Frontend integration fixes (3–4 hours)

| # | Task | File(s) | Rationale |
|---|------|---------|-----------|
| B1 | Add `credentials: 'include'` to `fetch` | `src/frontend/src/shared/services/apiclient.js` | Allows session cookies to travel with every request |
| B2 | Add 401 interceptor to `APIClient` — redirect to `/login` and clear `localStorage` | `apiclient.js` | Prevents stuck "logged in" state when session expires |
| B3 | Add `CreateThought` component to Feed | New component, update `feed.js` | Users can write and submit posts |
| B4 | Make usernames clickable links to `/@username` | `thoughtitem.js`, `useritem.js`, `usercard.js`, `userheader.js` | Core "opening profiles" requirement |
| B5 | Fix `UserItem` link — change `/${user.username}` to `/@${user.username}` | `useritem.js` | User list clicks currently navigate to wrong URL |
| B6 | Fix property name `thoughts` → `posts` in `UserCard` | `usercard.js` | Counter was blank |
| B7 | Fix property name `retweets` → `reposts` in `ThoughtItem` | `thoughtitem.js` | Repost count was blank |
| B8 | Map `userId` to user objects for feed posts | `app.js` or `feed.js` | Shows correct authors in feed |
| B9 | Wire Follow/Unfollow buttons in `UserHeader` and `UserItem` | `userheader.js`, `useritem.js`, `app.js` | Buttons exist but do nothing |
| B10 | Add conditional Follow/Following/Edit Profile button state | `userheader.js` | Should show "Edit Profile" on own profile, "Follow" / "Following" on others |
| B11 | Replace hardcoded "Joined March 2011" with real `user.created` date | `userheader.js` | Remove placeholder data |

### Phase C — UI Redesign with DaisyUI + Tailwind (6–8 hours)

This is the bulk of the work. The user has explicitly requested a complete redesign.

#### C1 — Tooling Setup
- Add `tailwindcss`, `postcss`, `autoprefixer`, `daisyui` to `devDependencies`.
- Remove `sass` from `devDependencies`.
- Initialize Tailwind config with `content: ["./src/**/*.{js,jsx}"]`.
- Configure `postcss`.
- Ensure `index.html` or `index.css` imports the Tailwind directives.

#### C2 — Theme System
- Configure `daisyui.themes` in `tailwind.config.js` with at least `light` and `dark`.
- Add a theme toggle to the navbar (e.g., a sun/moon button) that sets `data-theme` on `<html>` and persists to `localStorage`.
- The user explicitly wants light and dark themes.

#### C3 — Page-by-Page Redesign

| Page | Components | DaisyUI Elements to Use |
|------|------------|-------------------------|
| **Navbar** | `navbar.js`, `dropdown.js` | `navbar`, `dropdown`, `btn`, `avatar` |
| **Feed** | `feed.js`, `usercard.js`, `createthought.js`, `thoughtlist.js`, `thoughtitem.js` | `card`, `textarea`, `btn`, `btn-primary`, `divider`, `skeleton` |
| **Profile** | `profile.js`, `userheader.js`, `controlbar.js`, `thoughtlist.js`, `userlist.js` | `card`, `tabs`, `avatar`, `btn`, `stat` |
| **Login** | `login.js` | `card`, `input`, `btn`, `alert` |
| **Signup** | `signup.js` | `card`, `input`, `btn`, `alert` |
| **Settings** | `settings.js`, `settingsmenu.js`, `editprofile.js`, `password.js` | `card`, `input`, `tabs`, `btn`, `alert` |
| **Shared** | `loading.js`, `errorboundary.js`, `link.js` | `loading` (spinner), `alert` |

#### C4 — Icon Strategy
- The app currently uses `@fortawesome/react-fontawesome`.
- **Decision:** Replace with inline SVGs or a lightweight icon library compatible with React 18 (e.g., `heroicons` or `lucide-react`). DaisyUI pairs well with Heroicons.
- Removing FontAwesome reduces bundle size and avoids version conflicts.

#### C5 — SCSS Cleanup
- Delete `src/frontend/src/styles/` directory entirely.
- Delete all `*.scss` imports from components.
- Keep one global CSS file (or `index.css`) with only `@tailwind` directives.

### Phase D — Verification (1–2 hours)

| Step | How |
|------|-----|
| Backend | `cd src/apigateway && go build -v -o service` |
| Frontend dev | `cd src/frontend && npm start`, test login, post creation, profile navigation, theme toggle |
| Frontend build | `npm run build` must succeed |
| Docker | `make` should build all images |

---

## 5. Decisions Log

| # | Decision | Rationale |
|---|----------|-----------|
| 1 | **Fix backend body parsing to JSON** rather than changing frontend to `FormData` | JSON is the modern standard, and the frontend already sends it. Changing 3 controller files is less work than refactoring the frontend API client and every form. |
| 2 | **Default `limit=20` in backend** rather than adding it to every frontend call | It's a cleaner API contract and fixes the issue for all consumers. |
| 3 | **Keep custom router** rather than migrating to React Router | The router works. Replacing it is high risk for minimum work. |
| 4 | **Resolve post authors in frontend** rather than adding `user` to `Post` proto | Avoids protobuf regeneration across 4 services (Go + Python) and keeps changes localized. |
| 5 | **Downgrade React to 18.3.1** (or keep at 18.x) rather than keeping 19 | Matches AGENTS.md documentation, matches `react-scripts@4` maturity, reduces build risk. |
| 6 | **Use DaisyUI + Tailwind** as requested | Provides ready-made components (navbar, card, button, tabs) and a built-in theme system (light/dark). |
| 7 | **Replace FontAwesome with Heroicons/Lucide** | Lighter, more modern, aligns better with Tailwind/DaisyUI aesthetic. |
| 8 | **No backend schema changes** | The existing schema fully supports the required features. |
| 9 | **Add 401 interceptor** to redirect on auth failure | Fixes the broken "logged in but session expired" state. |
| 10 | **Wire Follow/Unfollow** rather than hiding the buttons | The buttons already exist in the UI; they just need `onClick` handlers and conditional state. |

---

## 6. Estimated Effort

| Phase | Estimated Time |
|-------|---------------|
| A — Backend fixes | 1–2 hours |
| B — Frontend integration fixes | 3–4 hours |
| C — UI redesign (DaisyUI + Tailwind) | 6–8 hours |
| D — Verification | 1–2 hours |
| **Total** | **~11–16 hours** |

---

## 7. Risk Assessment

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Upgraded dependencies break Webpack compilation | Low | Upgraded to react-scripts@5.0.1 and Webpack 5 to support modern ESM and Node 22. |
| Tailwind class purge removes DaisyUI classes | Low | Ensure `tailwind.config.js` `content` includes all JSX files and DaisyUI is in `plugins`. |
| Cookie auth still fails after `credentials: 'include'` | Low | Verify API gateway and dev proxy do not strip cookies; ensure `SameSite=Strict` works on `localhost` (it does for same-origin). |
| Frontend dev proxy path rewrite mismatch | Low | Proxy strips `/api` correctly. Verify after backend fixes. |
| Follow/Unfollow wiring breaks profile state | Low | Ensure `fetchProfile` is called after follow action to refresh `followed` status. |

---

## 8. Files That Will Be Modified (Comprehensive List)

### Backend
- `src/apigateway/api/auth_controller.go`
- `src/apigateway/api/user_controller.go`
- `src/apigateway/api/post_controller.go`

### Frontend
- `src/frontend/package.json`
- `src/frontend/src/index.js` (add Tailwind import)
- `src/frontend/src/app.js`
- `src/frontend/src/shared/services/apiclient.js`
- `src/frontend/src/screens/feed/feed.js`
- `src/frontend/src/screens/feed/createthought.js` (new)
- `src/frontend/src/shared/components/thoughtlist/thoughtitem.js`
- `src/frontend/src/shared/components/userlist/useritem.js`
- `src/frontend/src/screens/feed/usercard.js`
- `src/frontend/src/screens/profile/userheader.js`
- `src/frontend/src/screens/profile/profile.js`
- `src/frontend/src/screens/profile/controlbar.js`
- `src/frontend/src/screens/signup/login.js`
- `src/frontend/src/screens/signup/signup.js`
- `src/frontend/src/screens/settings/settings.js`
- `src/frontend/src/screens/settings/editprofile.js`
- `src/frontend/src/screens/settings/password.js`
- `src/frontend/src/screens/settings/settingsmenu/settingsmenu.js`
- `src/frontend/src/shared/components/navbar/navbar.js`
- `src/frontend/src/shared/components/navbar/dropdown.js`
- `src/frontend/src/shared/components/loading/loading.js`
- `src/frontend/src/shared/components/errorboundary/errorboundary.js`
- `src/frontend/src/shared/router/link.js` (style updates)

### Styling (Deleted)
- `src/frontend/src/styles/main.scss`
- `src/frontend/src/styles/_variables.scss`
- `src/frontend/src/styles/_components.scss`
- `src/frontend/src/styles/_helpers.scss`
- `src/frontend/src/styles/_texts.scss`
- `src/frontend/src/styles/_reset.scss`
- `src/frontend/src/styles/_colors.scss`
- `src/frontend/src/styles/_fonts.scss`
- All per-component `*.scss` files

### New Config Files
- `src/frontend/tailwind.config.js`
- `src/frontend/postcss.config.js`
- `src/frontend/src/index.css` (replaces `main.scss`)

---

*Assessment generated on 2026-05-27.*

---

## 9. Implementation Progress

This section tracks what has been done and what remains. A fresh agent should read this file first, then continue with the `Next Task` below.

### Completed
- [x] Expanded assessment with API route audit (Section 2)
- [x] Updated AGENTS.md with decisions
- [x] **A1-A3:** Backend controller fixes (JSON body parsing + default `limit=20` + Go build verified)
- [x] **B1-B11:** Frontend integration fixes (credentials + 401 interceptor, create post, profile links, follow/unfollow, display bugs, author mapping)
- [x] **C1-C5:** UI Redesign — Tailwind + DaisyUI tooling, theme system (light/dark toggle + localStorage), page redesigns, SCSS cleanup, FontAwesome replacement
- [x] **D:** Verification — frontend production build succeeds, Docker builds succeed
- [x] **E:** Node, Webpack & React-Scripts Upgrade — Upgraded to react-scripts@5.0.1, react@18.3.1, Node 22 (in Dockerfile), and removed craco config.
- [x] **F:** Session Endpoint Enhancement — Added currentSessionId and userId to GET /sessions, marked the active session in the settings view, and disabled termination of the active session.
- [x] **G:** Final SVG & Lucide Migration — Replaced all remaining inline SVGs in shared lists, toasts, and headers.
- [x] **H:** Interactive UI/UX Animations — Added modern hover and active scaling micro-animations on interactive action buttons (Like, Repost, Delete) across the feed and post detail screen.

### Remaining
- [ ] None — project meets minimum viable goal

### Fresh Agent Handoff
If you're picking this up, the project is in a working state. Key things to know:
- Backend controllers parse JSON bodies (`c.Bind`) with default `limit=20` on paginated endpoints.
- Frontend `fetch` includes `credentials: 'include'` and has a 401 interceptor.
- UI is fully DaisyUI + Tailwind with light/dark theme toggle.
- All SCSS and FontAwesome have been removed.
- React and react-scripts have been upgraded to 18.3.1 and 5.0.1 respectively (running Webpack 5, fully tree-shaking).
- If you need to make changes, check `AGENTS.md` for build commands and architecture notes.
