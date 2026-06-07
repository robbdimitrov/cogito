# Thoughts - Agent Notes

## Architecture

Microservices app with an HTTP gateway calling gRPC backends.

| Service | Language | Role | Entrypoint |
|---|---|---|---|
| `apigateway` | Go | `net/http` API gateway | `main.go` |
| `postservice` | Go | gRPC - posts, likes, reposts | `main.go` |
| `authservice` | Rust | gRPC - sessions | `src/main.rs` |
| `userservice` | Rust | gRPC - users, follows | `src/main.rs` |
| `imageservice` | Rust | gRPC + HTTP - image upload staging, verification, cleanup | `src/main.rs` |
| `frontend` | Next.js / React | App Router frontend | `src/app/` |
| `database` | PostgreSQL | Versioned schema migrations | - |

- Proto contract: `pb/thoughts.proto`
- Backend gRPC port: **5050**; `imageservice` HTTP port: **8081**; gateway + frontend port: **8080**
- All backend services connect to Postgres via `DATABASE_URL` (e.g. `postgresql://postgres:kubernetes@database:5432`)

## Build

Docker images are built with Make. Tags target `localhost:5000/thoughts/<service>`.

```sh
make                  # builds all service images, migration image, and frontend image
make <service>        # individual service
```

### Frontend dev server

```sh
cd apps/frontend
npm install --no-optional
npm run dev             # dev server on :3000
npm run build           # production build
npm start               # serve the production build
```

`src/app/api/[...path]/route.ts` proxies `/api/:path*` to `${API_URL || 'http://localhost:8080'}/:path*`, preserving same-origin browser requests while the gateway receives paths without the `/api` prefix. Client-side API calls should use `/api/...` with `credentials: 'include'`; server components/helpers should call the gateway directly via `API_URL` and forward cookies from `next/headers`.

`src/proxy.ts` is the Next Proxy route guard. Keep `/api`, `_next/static`, `_next/image`, and metadata files excluded from its matcher so API rewrites and static assets are not session-gated. Do not put broad data fetching in Proxy beyond lightweight route/session checks.

### Go services

```sh
cd apps/apigateway   # or apps/postservice
go mod download
go build -v -o service
```

Dockerfiles use multi-stage builds: `golang:1.26` builder → `scratch` runtime.
**Build note:** `CGO_ENABLED=0` must be set when building for the `scratch` stage, otherwise the binary will fail at runtime with a linker error (`exec /service: no such file or directory`).



### Rust services

```sh
cd apps/authservice   # or apps/userservice or apps/imageservice
cargo run
```

## Protobuf / Codegen

Run `make proto` after changing `pb/thoughts.proto`.

The target runs the equivalent commands in both Go service directories:
```sh
cd apps/apigateway   # or apps/postservice
protoc --go_out=. --go-grpc_out=. ../../pb/thoughts.proto
```
The `go_package` option is `./genproto`, so outputs land in `<service>/genproto/`.



**Rust** is handled automatically via `build.rs` and `tonic-build` during `cargo build` in `authservice`, `userservice`, and `imageservice`.

## Kubernetes / Local Deploy

```sh
./scripts/deploy.sh
```

The script builds images, creates the namespace and generated secrets, applies
the manifests, waits for rollouts, and starts the frontend port-forward.

Cleanup:
```sh
kubectl delete -f ./deploy -n thoughts
kubectl delete namespace thoughts
```

## Testing

You can run all unit tests across the frontend and backend microservices using the provided `Makefile` target:

```sh
make test
```

Alternatively, you can run tests for individual services:
- **Rust services**: Run `cargo test` inside the respective service directory.
- **Go services**: Run `go test -v ./...` inside the respective service directory. Follow the 80/20 rule for test coverage (aim for ~80% coverage focusing on the most critical 20% of code).
- **Frontend**: Tests are written with Vitest and React Testing Library. Run `npm run test` inside `apps/frontend`. Follow the 80/20 rule for frontend test coverage as well, focusing on critical utility functions, hooks, and core shared components.

## Database Notes

- `apps/database/migrations/` contains paired `NNNNNN_description.up.sql` and `.down.sql` migrations.
- The migration image runs before the gateway starts and applies pending migrations to the `thoughts` database.

## Constraints & Gotchas

- Follow **SOLID**, **KISS**, and **DRY** when writing code and refactoring: keep changes focused, prefer simple local patterns, avoid duplicated logic, and add abstractions only when they remove real complexity.
- Use standard initialisms in Go names (`ID`, `URL`, `HTTP`, `DB`). Generated identifiers are exempt.
- HTTP APIs return JSON consistently, including errors. Use symbolic `http.Status*` constants.
- Type API boundaries explicitly. Prefer `unknown` over `any`, map transport DTOs deliberately, and keep strict TypeScript enabled.
- Comments explain constraints or intent. Do not preserve implementation history, temporary reasoning, or narration of obvious code.
- Keep handwritten Go `gofmt`-clean and Rust `rustfmt`-clean. Regenerate generated code instead of editing it manually.
- Write behavior-oriented tests with typed fakes and framework-native HTTP test utilities. Use inline Rust tests for private helpers and service-level test modules for endpoint behavior.
- New migrations use two-space indentation, paired up/down files, and corrective migrations rather than rewriting applied history.
- Microservices must be stateless and designed to work properly in multi-replica environments.
- Frontend styling should use Tailwind utilities and DaisyUI components. Add custom CSS only in EXTREME circumstances.
- Frontend API response handling must tolerate `204 No Content` and non-JSON gateway error bodies; avoid calling `response.json()` unconditionally.
- The `deletePost` query in `postservice/post/db_client.go` only checks `post_id` in the `WHERE` clause despite accepting `userID` as a parameter (potential bug if you modify that area).

## Git Conventions

- Use **single-line commits** (summary only, no body). Keep the message under 72 characters when possible.
