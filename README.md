# Thoughts

**Thoughts** is a full-stack post-sharing platform built with a production-grade microservices architecture. Combining high-performance Go and Rust gRPC backends with a SvelteKit frontend, it provides a seamless experience for users to create, browse, and interact with posts.

## Features

- **Post interactions**: Create plain posts, replies, quotes, and reposts. Like, unlike, repost, and remove reposts.
- **Hashtags**: Extracted from post content at write time, stored relationally, and searchable with trigram typeahead.
- **Global search**: Full-text search across users, posts, and hashtags via Meilisearch, kept current by a transactional outbox.
- **Image uploads**: Magic-byte validated, server-named, staged in SeaweedFS with a verify-then-consume lifecycle.
- **Cache layer**: Dragonfly (Redis-protocol) backs rate-limit token buckets and login-failure counters, keeping the hot path off PostgreSQL.
- **Session management**: Argon2id password hashing, HMAC-keyed session tokens, per-user session listing and remote revocation.
- **Production-ready**: Stateless services, bounded concurrency, explicit gRPC timeouts, circuit breaker and retry on the image proxy, structured JSON logging.
- **HA-ready**: Ships at `replicas: 1` but correct at `replicas: N`. No shared in-process state; the search outbox worker uses `SELECT FOR UPDATE SKIP LOCKED` with LISTEN/NOTIFY.

## Architecture

```mermaid
graph TD
    Browser["Browser"]

    subgraph cluster ["Kubernetes Cluster"]
        Web["Frontend / BFF<br>(SvelteKit SSR)"]:::frontend
        API["API Gateway<br>(Go)"]:::gateway

        subgraph services ["gRPC Services"]
            Auth["Auth Service<br>(Rust)"]:::service
            Users["User Service<br>(Rust)"]:::service
            Posts["Post Service<br>(Go)"]:::service
            Images["Image Service<br>(Rust)"]:::service
            Search["Search Service<br>(Go)"]:::service
        end

        subgraph data ["Data & Storage"]
            DB[("PostgreSQL<br>source of truth")]:::database
            Cache[("Dragonfly<br>rate limiting")]:::cache
            Blob[("SeaweedFS<br>image objects")]:::storage
            Meili[("Meilisearch<br>search index")]:::search
        end
    end

    Browser --> Web
    Web --> API
    API --> Auth
    API --> Users
    API --> Posts
    API --> Images
    API --> Search
    Auth --> DB
    Users --> DB
    Posts --> DB
    Images --> DB
    Images --> Blob
    Search --> DB
    Search --> Meili
    API --> Cache

    classDef frontend fill:#0ea5e9,stroke:#0284c7,stroke-width:2px,color:#fff
    classDef gateway fill:#6366f1,stroke:#4f46e5,stroke-width:2px,color:#fff
    classDef service fill:#10b981,stroke:#059669,stroke-width:2px,color:#fff
    classDef database fill:#f59e0b,stroke:#d97706,stroke-width:2px,color:#fff
    classDef storage fill:#8b5cf6,stroke:#7c3aed,stroke-width:2px,color:#fff
    classDef cache fill:#ef4444,stroke:#dc2626,stroke-width:2px,color:#fff
    classDef search fill:#6366f1,stroke:#4f46e5,stroke-width:2px,color:#fff

    style cluster fill:transparent,stroke:#64748b
    style services fill:transparent,stroke:transparent
    style data fill:transparent,stroke:transparent
```

| Service | Language | Description |
| --- | --- | --- |
| [frontend](/apps/frontend) | TypeScript | SvelteKit SSR application; sole public entry point and BFF. |
| [apigateway](/apps/apigateway) | Go | Public HTTP API, auth boundary, gRPC orchestrator, image proxy. |
| [authservice](/apps/authservice) | Rust | Session lifecycle — issue, validate, revoke, background expiry cleanup. |
| [userservice](/apps/userservice) | Rust | User accounts, credentials, and follow graph. |
| [postservice](/apps/postservice) | Go | Posts, replies, quotes, reposts, likes, hashtags, and feed. |
| [imageservice](/apps/imageservice) | Rust | Image upload staging, verification, and serving via SeaweedFS. |
| [searchservice](/apps/searchservice) | Go | Full-text search; consumes the PostgreSQL outbox and syncs to Meilisearch. |
| [database](/apps/database) | PostgreSQL | Versioned schema migrations managed by `migrate/migrate`. |

### Infrastructure

Four in-cluster stateful services run alongside the application:

- **PostgreSQL** — Primary source of truth for all application data.
- **Dragonfly** — Redis-protocol cache backing rate-limit token buckets and login-failure counters. The API fails open on unavailability.
- **SeaweedFS** — S3-compatible object store holding image bytes. Images are staged under `staging/` on upload and promoted on post creation.
- **Meilisearch** — Derived search index. PostgreSQL is the only source of truth; Meilisearch is populated and kept current by the transactional outbox worker. The index can be rebuilt by replaying the outbox.

## Docs

Architectural specs live in [`docs/`](/docs/):

| Doc | Contents |
| --- | --- |
| [architecture.md](/docs/architecture.md) | Service topology, request flow, integration patterns |
| [api.md](/docs/api.md) | HTTP endpoints, middleware stack, gRPC services, pagination |
| [data-model.md](/docs/data-model.md) | Schema, indexes, entity relationships, domain invariants |
| [security.md](/docs/security.md) | Session model, password policy, ownership rules, rate limiting |
| [business-rules.md](/docs/business-rules.md) | Validation constraints, post types, ordering, content policy |
| [frontend.md](/docs/frontend.md) | Route map, layout hierarchy, SSR, data fetching |
| [design-system.md](/docs/design-system.md) | Theme, component inventory, layout |
| [infrastructure.md](/docs/infrastructure.md) | Kubernetes resources, secrets, probes, storage |

## Deploy

Deploy the application to your active Kubernetes cluster using the provided script:

```sh
./scripts/deploy.sh
```

The script builds the Docker images, creates the Kubernetes namespace (`thoughts` by default) and resources, waits for pods to be ready, and starts a port-forward to the frontend at http://localhost:8080/. It is idempotent and safe to re-run for updates.

## Cleanup

To remove all deployed resources and the namespace:

```sh
kubectl delete -f ./deploy -n thoughts
kubectl delete namespace thoughts
```

## Testing

Run all unit tests across the frontend and backend microservices:

```sh
make test
```

## License

Licensed under the [MIT](LICENSE) License.
