# Thoughts — Agent Notes

## Architecture

Microservices app with an HTTP gateway calling gRPC backends.

| Service | Language | Role | Entrypoint |
|---|---|---|---|
| `apigateway` | Go 1.19 | Echo HTTP API gateway | `main.go` |
| `postservice` | Go 1.19 | gRPC — posts, likes, reposts | `main.go` |
| `authservice` | Python 3.11 | gRPC — sessions | `main.py` |
| `userservice` | Python 3.11 | gRPC — users, follows | `main.py` |
| `frontend` | React 18 (CRA 4.x) | SPA + nginx | `src/index.js` |
| `database` | PostgreSQL 14 | Schema init via `schema.sql` | — |

- Proto contract: `pb/thoughts.proto`
- Backend gRPC port: **5050**; gateway + frontend port: **8080**
- All backend services connect to Postgres via `DATABASE_URL` (e.g. `postgresql://postgres:kubernetes@database:5432`)

## Build

Docker images are built with Make. Tags target `localhost:5000/thoughts/<service>`.

```sh
make                  # builds apigateway, authservice, database, frontend
make <service>        # individual service
```

**Known Makefile issues (fixed):** registry paths and `imageservice` references were corrected.

### Frontend dev server

```sh
cd src/frontend
npm install --no-optional
npm start               # dev server on :3000, /api proxied to localhost:8080
npm run lint            # eslint src
npm run build           # production build
```

`setupProxy.js` proxies `/api` → `http://localhost:8080` and strips the `/api` prefix. The production nginx config (`nginx.conf`) proxies `/api/` → `http://apigateway:8080/`.

### Go services

```sh
cd src/apigateway   # or src/postservice
go mod download
go build -v -o service
```

Dockerfiles use multi-stage builds: `golang:1.19` builder → `scratch` runtime.  
**Build note:** `CGO_ENABLED=0` must be set when building for the `scratch` stage, otherwise the binary will fail at runtime with a linker error (`exec /service: no such file or directory`).

### Python services

```sh
cd src/authservice   # or src/userservice
pip install -r requirements.txt
python main.py
```

## Protobuf / Codegen

There is **no automated codegen script**. If `pb/thoughts.proto` changes, regenerate outputs manually in each service.

**Go** (run from inside the service dir):
```sh
cd src/apigateway   # or src/postservice
protoc --go_out=. --go-grpc_out=. ../../pb/thoughts.proto
```
The `go_package` option is `./genproto`, so outputs land in `<service>/genproto/`.

**Python** (run from inside the service dir):
```sh
cd src/authservice
python -m grpc_tools.protoc -I../.. --python_out=. --grpc_python_out=. pb/thoughts.proto
# then move/adjust thoughts_pb2.py and thoughts_pb2_grpc.py into the authservice/ package
```

## Kubernetes / Local Deploy

```sh
kubectl create namespace thoughts
kubectl apply -f ./k8s -n thoughts
kubectl port-forward service/frontend 8080:8080 -n thoughts
```

Cleanup:
```sh
kubectl delete -f ./k8s -n thoughts
kubectl delete namespace thoughts
```

**Deployment fixes applied:** each backend Deployment and Service now uses a unique `component` label so Services route only to their intended pods. `imagePullPolicy: IfNotPresent` is set on all containers so `kind` clusters can use locally loaded images without a registry.

## Testing

There are **no tests** in this repo. Do not try to run a test suite.

## Database Notes

- `src/database/schema.sql` is copied to `/docker-entrypoint-initdb.d/` in the Postgres image and executes on first container start.
- The schema runs `CREATE DATABASE thoughts;` then `\connect thoughts` before creating tables. The `DATABASE_URL` env vars now end with `/thoughts` so services connect to the correct database.

## Constraints & Gotchas

- `react-scripts` is pinned to **4.0.3** and `node-sass` was replaced with **`sass`** (Dart Sass) because `node-sass` 8.x prebuilt binaries are unavailable for Node 20 on arm64. The custom SCSS `rem()` mixin was renamed to `to-rem()` to avoid clashing with Dart Sass’s built-in `rem()` function.
- No CI workflows, pre-commit hooks, or lint configs for Go/Python.
- The `deletePost` query in `postservice/post/db_client.go` only checks `post_id` in the `WHERE` clause despite accepting `userID` as a parameter (potential bug if you modify that area).

## Git Conventions

- Use **single-line commits** (summary only, no body). Keep the message under 72 characters when possible.

## Project Health & Redesign Decisions

*(Added after assessment on 2026-05-27. Full details in `ASSESSMENT.md`.)*

### Known Bugs Affecting Core Features

1. **API Gateway body parsing mismatch (CRITICAL):** Controllers read `c.FormValue(...)`, but the frontend sends JSON. Every mutating request (login, signup, create post, update profile) sends empty values to gRPC, causing failures.
2. **Missing default `limit` query param (CRITICAL):** Paginated endpoints (`/posts/feed`, `/users/:id/posts`, etc.) require both `page` and `limit`. The frontend only sends `page`, so all list endpoints return `400`.
3. **Frontend `fetch` missing `credentials: 'include'` (CRITICAL):** The API gateway uses HttpOnly `session` cookies, but the browser never sends them back. Authenticated API calls get `401` even though the frontend thinks the user is logged in (it checks `localStorage`).
4. **No "create post" UI:** The `Feed` screen has no input for writing thoughts.
5. **Feed shows wrong authors:** `Post` responses do not include author info; `ThoughtItem` falls back to the current user, so every post looks like it was written by the viewer.
6. **No clickable profile links:** Usernames in posts/user lists are plain text, not navigation links.

### Decisions

- Fix backend controllers to parse **JSON bodies** rather than changing the frontend to `FormData`.
- Add **default `limit=20`** in backend controllers instead of updating every frontend call.
- Keep the **custom router** (do not migrate to React Router) to minimize risk.
- Resolve post authors in the **frontend** (fetch users per `userId`) rather than modifying the `Post` protobuf and regenerating across all services.
- Stay on **React 18.x** (downgrade from 19 if necessary) to match `react-scripts@4` and AGENTS.md documentation.
- Replace all custom **SCSS** with **Tailwind CSS + DaisyUI**. Remove `sass` and all `*.scss` files.
- Support **light and dark themes** via DaisyUI's theme system; add a toggle in the navbar and persist to `localStorage`.
- Replace **FontAwesome** with a lighter icon set (Heroicons or Lucide) for consistency with Tailwind/DaisyUI.
- No database schema changes are needed for login/posting/profiles.

## Project Health & Redesign Decisions

*(Added after assessment on 2026-05-27. Full details in `ASSESSMENT.md`.)*

### Known Bugs Affecting Core Features

1. **API Gateway body parsing mismatch (CRITICAL):** Controllers read `c.FormValue(...)`, but the frontend sends JSON. Every mutating request (login, signup, create post, update profile) sends empty values to gRPC, causing failures.
2. **Missing default `limit` query param (CRITICAL):** Paginated endpoints (`/posts/feed`, `/users/:id/posts`, etc.) require both `page` and `limit`. The frontend only sends `page`, so all list endpoints return `400`.
3. **Frontend `fetch` missing `credentials: 'include'` (CRITICAL):** The API gateway uses HttpOnly `session` cookies, but the browser never sends them back. Authenticated API calls get `401` even though the frontend thinks the user is logged in (it checks `localStorage`).
4. **No "create post" UI:** The `Feed` screen has no input for writing thoughts.
5. **Feed shows wrong authors:** `Post` responses do not include author info; `ThoughtItem` falls back to the current user, so every post looks like it was written by the viewer.
6. **No clickable profile links:** Usernames in posts/user lists are plain text, not navigation links.

### Decisions

- Fix backend controllers to parse **JSON bodies** rather than changing the frontend to `FormData`.
- Add **default `limit=20`** in backend controllers instead of updating every frontend call.
- Keep the **custom router** (do not migrate to React Router) to minimize risk.
- Resolve post authors in the **frontend** (fetch users per `userId`) rather than modifying the `Post` protobuf and regenerating across all services.
- Stay on **React 18.x** (downgrade from 19 if necessary) to match `react-scripts@4` and AGENTS.md documentation.
- Replace all custom **SCSS** with **Tailwind CSS + DaisyUI**. Remove `sass` and all `*.scss` files.
- Support **light and dark themes** via DaisyUI's theme system; add a toggle in the navbar and persist to `localStorage`.
- Replace **FontAwesome** with a lighter icon set (Heroicons or Lucide) for consistency with Tailwind/DaisyUI.
- No database schema changes are needed for login/posting/profiles.
