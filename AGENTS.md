# Thoughts — Agent Notes

## Architecture

Microservices app with an HTTP gateway calling gRPC backends.

| Service | Language | Role | Entrypoint |
|---|---|---|---|
| `apigateway` | Go 1.26 | Echo HTTP API gateway | `main.go` |
| `postservice` | Go 1.26 | gRPC — posts, likes, reposts | `main.go` |
| `authservice` | Rust | gRPC — sessions | `src/main.rs` |
| `userservice` | Rust | gRPC — users, follows | `src/main.rs` |
| `frontend` | Next.js 16 / React 19 | App Router frontend | `src/app/` |
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
npm run dev             # dev server on :3000
npm run build           # production build
npm start               # serve the production build
```

`next.config.mjs` rewrites `/api/:path*` to `${API_URL || 'http://localhost:8080'}/:path*`, preserving same-origin browser requests while the gateway receives paths without the `/api` prefix. Client-side API calls should use `/api/...` with `credentials: 'include'`; server components/helpers should call the gateway directly via `API_URL` and forward cookies from `next/headers`.

`src/proxy.ts` is the Next Proxy route guard. Keep `/api`, `_next/static`, `_next/image`, and metadata files excluded from its matcher so API rewrites and static assets are not session-gated. Do not put broad data fetching in Proxy beyond lightweight route/session checks.

### Go services

```sh
cd src/apigateway   # or src/postservice
go mod download
go build -v -o service
```

Dockerfiles use multi-stage builds: `golang:1.26` builder → `scratch` runtime.
**Build note:** `CGO_ENABLED=0` must be set when building for the `scratch` stage, otherwise the binary will fail at runtime with a linker error (`exec /service: no such file or directory`).



### Rust services

```sh
cd src/authservice   # or src/userservice
cargo run
```

## Protobuf / Codegen

There is **no automated codegen script**. If `pb/thoughts.proto` changes, regenerate outputs manually in each service.

**Go** (run from inside the service dir):
```sh
cd src/apigateway   # or src/postservice
protoc --go_out=. --go-grpc_out=. ../../pb/thoughts.proto
```
The `go_package` option is `./genproto`, so outputs land in `<service>/genproto/`.



**Rust** is handled automatically via `build.rs` and `tonic-build` during `cargo build`.

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

Unit tests exist for the Rust services. Run `cargo test` inside the respective service directory. For Go services, follow the 80/20 rule for test coverage (aim for ~80% coverage focusing on the most critical 20% of code).

## Database Notes

- `src/database/schema.sql` is copied to `/docker-entrypoint-initdb.d/` in the Postgres image and executes on first container start.
- The schema runs `CREATE DATABASE thoughts;` then `\connect thoughts` before creating tables. The `DATABASE_URL` env vars now end with `/thoughts` so services connect to the correct database.

## Constraints & Gotchas

- Follow **SOLID**, **KISS**, and **DRY** when writing code and refactoring: keep changes focused, prefer simple local patterns, avoid duplicated logic, and add abstractions only when they remove real complexity.
- Frontend styling should use Tailwind utilities and DaisyUI components. Add custom CSS only in EXTREME circumstances.
- Frontend API response handling must tolerate `204 No Content` and non-JSON gateway error bodies; avoid calling `response.json()` unconditionally.
- No CI workflows, pre-commit hooks, or lint configs for Go/Python.
- The `deletePost` query in `postservice/post/db_client.go` only checks `post_id` in the `WHERE` clause despite accepting `userID` as a parameter (potential bug if you modify that area).

## Git Conventions

- Use **single-line commits** (summary only, no body). Keep the message under 72 characters when possible.
