# Frontend Instructions

These rules extend the repository-level `AGENTS.md` for `apps/frontend/`.

## Stack and Commands

Next.js App Router application using React, strict TypeScript, Tailwind CSS,
DaisyUI, Lucide React, Vitest, and React Testing Library.

Run from `apps/frontend/`:

```sh
npm run dev
npm run lint
npm run test
npm run build
npm start
```

## Data Flow

- Browser requests use `/api/...` with `credentials: 'include'`. The catch-all
  route at `src/app/api/[...path]/route.ts` proxies them to
  `${API_URL || 'http://localhost:8080'}` without the `/api` prefix.
- Server components and server helpers call the gateway through `API_URL` and
  forward request cookies through the established server API helper. When
  changing that boundary, narrow forwarding to only the cookies required by
  the gateway.
- Do not call the gateway directly from browser code or add a second generic
  proxy path.
- Use the established API client and server helpers. Response handling must
  tolerate `204 No Content` and non-JSON gateway errors; never call
  `response.json()` unconditionally.
- Preserve streaming in the catch-all proxy where possible. Do not buffer
  response bodies, and do not buffer request bodies without an explicit bound.
- Keep route-specific loading and mutation behavior near its App Router route.
  Put genuinely reusable components, hooks, services, and types under
  `src/shared/`.

## Next.js and TypeScript

- Keep strict TypeScript enabled. Prefer `unknown` over `any`, type API
  boundaries explicitly, and map transport DTOs deliberately.
- Default to server components. Add `'use client'` only for browser APIs,
  interactive state, event handlers, or client-only hooks.
- Avoid fetching the same data independently in Proxy, layouts, pages, and
  client effects. Choose one owner for each request and pass or cache the
  result through established framework primitives.
- `src/proxy.ts` is a lightweight route/session guard. Keep `/api`,
  `_next/static`, `_next/image`, and metadata files outside its matcher. Do not
  move broad application data fetching into Proxy.
- Use behavior-oriented Vitest and React Testing Library tests for API parsing,
  hooks, mappers, and user-visible component behavior.

## UI and Browser Security

- Prefer DaisyUI components and Tailwind utilities. Add custom CSS only when
  the design cannot be expressed clearly with existing utilities or tokens.
- Use Lucide React icons. Add inline SVG only when Lucide cannot represent the
  required symbol.
- Preserve semantic HTML, keyboard behavior, visible focus, useful labels, and
  accessible dialog and menu behavior.
- Never render user-controlled HTML directly. Validate dynamic `href` and
  `src` values against an explicit scheme and origin policy.
- Keep session credentials in `HttpOnly` cookies. Do not copy them into
  `localStorage`, client-readable cookies, query strings, or logs.
