# Architecture

## Service Topology

| Service      | Stack                   | Port(s)                  | Role                                                                            |
| ------------ | ----------------------- | ------------------------ | ------------------------------------------------------------------------------- |
| frontend     | SvelteKit, TypeScript   | 8080                     | SSR UI; sole public entry point; BFF for browser                                |
| apigateway   | Go, net/http            | 8080                     | Public HTTP API; auth boundary; gRPC orchestrator; image proxy                  |
| postservice  | Go, gRPC                | 5050                     | Posts, replies, quotes, reposts, likes, hashtags, feed                          |
| authservice  | Rust, Tonic             | 5050                     | Session lifecycle                                                               |
| userservice  | Rust, Tonic             | 5050                     | User accounts, credentials, follow graph                                        |
| imageservice | Rust, Tonic + Axum      | 5050 (gRPC), 8081 (HTTP) | Image upload staging, verification, serving                                     |
| flowservice  | Rust, Tonic             | 5050                     | Notifications and feed fan-out (Kafka consumer); full-text search (Meilisearch) |
| database     | PostgreSQL 18.4         | 5432                     | Shared persistent store                                                         |
| cache        | Dragonfly (Redis-compatible)   | 6379                     | Rate limiting and login throttle                                                |
| broker       | Redpanda (Kafka-compatible)    | 9092, 9644               | Event topics for CDC fan-out                                                    |
| connect      | Redpanda Connect               | —                        | CDC relay, search sync, backfill, and cleanup pipelines                         |
| storage      | SeaweedFS (S3-compatible)      | 8333                     | Binary image storage                                                            |
| search       | Meilisearch v1.15              | 7700                     | Full-text search index                                                          |

## Request Flow

```
Browser → Ingress (cogito.localhost) → frontend:8080 (SvelteKit SSR)
                                              │
                                    server-side only
                                              │
                                        apigateway:8080 (Go HTTP)
                                              │
                    ┌─────────────────────────┼──────────────────────────┐
               authservice:5050         postservice:5050          userservice:5050
               (session auth)           (posts/feed)              (users/follows)
                                              │
                                    imageservice:5050         flowservice:5050
                                    (upload lifecycle)        (search/notifications/feed)
                                              │
                                    imageservice:8081
                                    (HTTP proxied —
                                     upload bytes/serve)

Async path (Redpanda):
postservice / userservice
    → outbox (PostgreSQL)
        → Redpanda Connect (pg_cdc)
            → Redpanda topics (entity-changes, activity)
                → flowservice (notifications, feed fan-out, Meilisearch sync)
```

The browser never contacts apigateway directly. `connect-src 'self'` CSP
enforces the boundary. The frontend forwards the session cookie from its own
cookie jar to apigateway on every server-side request.

## Key Integration Patterns

| Pattern                    | Where used                                                                                                                |
| -------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| BFF (Backend-for-Frontend) | Frontend owns all browser traffic; calls apigateway only from server-side load functions and form actions                 |
| Auth boundary              | Gateway validates `session` cookie via AuthService, derives user ID, forwards as `user-id` gRPC metadata header           |
| Internal token             | All gRPC and imageservice HTTP calls carry `internal-token` header; compared constant-time at each backend                |
| Fan-out orchestration      | Gateway calls multiple gRPC backends per HTTP request (e.g., fetch post + resolve author + resolve quote)                 |
| Image staging              | Upload to `staging/{key}` → `VerifyUpload` ownership check → `ConsumeUpload` moves to `{key}`                             |
| CDC relay                  | Services write append-only `outbox` rows; Redpanda Connect relays PostgreSQL CDC to Redpanda topics                       |
| Event consumers            | `flowservice` consumes `entity-changes` and `activity` for notifications, materialized feed fan-out, and Meilisearch sync |
| Keyset pagination          | Posts: cursor = base64url(JSON{created, id}); keyset comparison for stable ordering                                       |
| Offset pagination          | Search results: cursor = base64url(JSON{offset}); capped at 1000                                                          |
| Fail-open degradation      | Rate limiter and login throttle allow traffic when Dragonfly is unavailable                                               |

## Service Responsibilities

**frontend** — Render all pages server-side. Forward session cookie to
apigateway via server-side fetch (`event.cookies` → `Cookie: session=...`
header). Validate form inputs client-side. No direct database or gRPC access.

**apigateway** — Authenticate every non-exempt request. Enforce body limits,
rate limits, and concurrency caps. Map gRPC status codes to HTTP status codes.
Proxy image traffic with retry and circuit breaker. Enforce ownership for
session deletion and user updates.

**postservice** — Enforce post-type exclusivity (reply–quote via application;
repost via DB CHECK). Enforce ownership on delete. Compute all counters at read
time. Extract and store hashtags. Write post, hashtag, and activity events to
`outbox` in the same transaction as mutations.

**authservice** — Issue, validate, and revoke sessions. Hash passwords with
Argon2id. Store only session ID hashes. Run hourly background session expiry
cleanup. Limit concurrent Argon2 operations via semaphore.

**userservice** — Validate and normalize user fields. Enforce follow constraints
(no self-follow; idempotent duplicate). Compute derived counts and `followed`
boolean at read time.

**imageservice** — Validate uploads by magic bytes (not MIME headers). Generate
server-controlled UUIDv4 filenames. Manage staging lifecycle in S3. Serve images
with `Cache-Control: private, max-age=86400`. Prevent path traversal on filename
access.

**flowservice** — Consume Redpanda `entity-changes` and `activity` topics.
Maintain notification records, materialize feed rows for regular accounts,
expose NotificationService and SearchService gRPC, and keep the Meilisearch
index in sync.

## Protobuf Contract

- Defined in `pkg/pb/cogito.proto`. 6 gRPC services.
- Go bindings generated by `make proto` into `genproto/` per service
  (apigateway, postservice). Never edited manually.
- Rust bindings generated per service via `build.rs` at compile time
  (authservice, userservice, imageservice, flowservice).
- Field numbers are preserved across changes. New fields are added; existing
  fields are never repurposed.

## Build System

| Target           | Action                                          |
| ---------------- | ----------------------------------------------- |
| `make`           | Build all service images                        |
| `make <service>` | Build one service image                         |
| `make proto`     | Regenerate Go protobuf bindings                 |
| `make format`    | `gofmt` on Go; `rustfmt --edition 2024` on Rust |
| `make lint`      | Format checks + frontend `npm run lint`         |
| `make test`      | All unit tests (Go, Rust, frontend)             |

Go services: `CGO_ENABLED=0` (scratch runtime). Image tag pattern:
`localhost:5000/cogito/{service}` (configurable via `IMAGE_PREFIX`).
