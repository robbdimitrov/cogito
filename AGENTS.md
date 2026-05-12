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

**Known Makefile issues:** several targets are missing a `/` in the registry path (`localhost:5000thoughts/...` instead of `localhost:5000/thoughts/...`). There is also an `imageservice` target and a k8s env var for it, but `src/imageservice/` does **not** exist.

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

## Testing

There are **no tests** in this repo. Do not try to run a test suite.

## Database Notes

- `src/database/schema.sql` is copied to `/docker-entrypoint-initdb.d/` in the Postgres image and executes on first container start.
- The schema runs `CREATE DATABASE thoughts;` then `\connect thoughts` before creating tables. However, the `DATABASE_URL` env vars in k8s do not specify a database name, so services will connect to the default `postgres` database unless the URL is updated to end with `/thoughts`.

## Constraints & Gotchas

- `react-scripts` is pinned to **4.0.3** and `node-sass` to **8.x** — do not upgrade lightly.
- No CI workflows, pre-commit hooks, or lint configs for Go/Python.
- The `deletePost` query in `postservice/post/db_client.go` only checks `post_id` in the `WHERE` clause despite accepting `userID` as a parameter (potential bug if you modify that area).

## Git Conventions

- Use **single-line commits** (summary only, no body). Keep the message under 72 characters when possible.
