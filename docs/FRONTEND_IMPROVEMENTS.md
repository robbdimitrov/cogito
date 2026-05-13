# Frontend Improvements Tracker

## Critical Bugs

- [x] **1. Profile dropdown uses `user.id` instead of `username`** — `dropdown.js:11`
- [x] **2. All posts show same author** — `thoughtlist.js:10` + `thoughtitem.js`
- [x] **3. Password visibility toggles do nothing** — `password.js`

## Important UX Fixes

- [x] **4. Like/Repost buttons are non-functional** — `thoughtitem.js:19-28`
  - Need onClick handlers calling the API to like/repost
- [x] **5. All timestamps hardcoded to `"3h"`** — `thoughtitem.js:13`
  - Added `formatRelativeTime()` helper using `post.created`
- [x] **6. Settings link 404s** — `dropdown.js:19`
- [x] **7. Home link navigates to `/feed`** — `navbar.js:25`
- [x] **8. Profile page always renders empty** — `app.js`
  - Added profile data fetching via `getUserByUsername` API
- [x] **9. Dropdown doesn't close on outside click** — `navbar.js`
- [x] **10. No scroll-to-top on navigation** — `router.js`
- [x] **11. Bare `alert()` for errors** — `app.js:110,121,129,136,143`
  - Replace with inline error state/messages
- [x] **12. No loading states** — blank screens during lazy load + API fetches
  - Added `Loading` component; wired into `Suspense`, `Feed`, and `Profile`
- [x] **13. No empty states** — no messages when feed/followers/posts are empty
  - Added empty messages to `ThoughtList` and `UserList`
- [x] **14. No error boundaries** — Added `ErrorBoundary` component in app.js
- [x] **15. No page title updates** — stays "Thoughts" on every page
  - Added `useDocumentTitle` hook and per-route titles in `app.js`
- [x] **16. No favicon** — default CRA React favicon
  - Replaced with custom SVG favicon
- [x] **17. No inline form validation** — relies on HTML5 only
  - Added real-time username and password validation to signup and password forms
- [x] **18. No submit button disabled during request** — double-submit possible
  - Added `isSubmitting` state to all auth/settings forms
- [x] **19. Typos** — "accout" → "account" in login.js and signup.js

## Code Cleanup

- [x] **20. 4 unused production deps** — localforage, match-sorter, quartzite, sort-by
- [x] **21. Unused `mappers.js`** — mapUser/mapPost never imported
- [x] **22. Invalid `type="text"` on `<textarea>`** — editprofile.js

## Backend Support Changes

- [x] Added `GetUserByUsername` to protobuf → `pb/thoughts.proto`
- [x] Added `/api/users?username=` endpoint → `apigateway/api/router.go`
- [x] Added `getUserByUsername` controller → `apigateway/api/user_controller.go`
- [x] Added `GetUserByUsername` gRPC handler → `userservice/controller.py`
- [x] Added `get_user_by_username` SQL query → `userservice/db_client.py`
- [x] Regenerated protobuf code for Go + Python
