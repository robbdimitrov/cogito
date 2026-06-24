# Design Brief: Merge searchservice + eventsservice into a single Rust service

## What you're replacing

Two Go services that both sit off the hot request path:

**searchservice** — a thin gRPC proxy. Receives `SearchService` RPC calls from the gateway, forwards them to Meilisearch via HTTP, maps JSON hits back to proto messages. No Kafka, no write path. ~300 lines of Go.

**eventsservice** — a Kafka consumer + gRPC server. Consumes `entity-changes` and `activity` topics from Redpanda, writes to `notifications` and `feed` tables in PostgreSQL, caches follower counts in Valkey, and serves `NotificationService` RPC calls. ~800 lines of Go across consumers, stores, and the gRPC handler.

## What the combined Rust service would own

- Serve `SearchService` gRPC → query Meilisearch
- Serve `NotificationService` gRPC → query PostgreSQL (`notifications` table)
- Consume `activity` topic → insert/delete notification rows
- Consume `activity` topic → fan-out feed rows (with Valkey follower-count cache + threshold pull-merge)
- Consume `entity-changes` topic → delete stale notification rows on post delete
- Periodic cleanup → DELETE old `outbox` and `feed` rows

Everything async on tokio. One binary, one K8s deployment, one set of env vars.

---

## Rust crate map (Go → Rust)

| Go dependency | Rust equivalent | Notes |
|---|---|---|
| `github.com/twmb/franz-go` | `rdkafka` (librdkafka binding) or `rskafka` (pure Rust) | `rskafka` is simpler but less battle-tested; `rdkafka` is the safe production choice |
| `github.com/jackc/pgx/v4` | `sqlx` with `tokio-postgres` | Already used in authservice/userservice — consistent pattern |
| `github.com/valkey-io/valkey-go` | `redis` crate (`fred` or `deadpool-redis`) | Valkey is Redis-protocol compatible; any Redis client works |
| `github.com/meilisearch/meilisearch-go` | `meilisearch-sdk` (official Rust crate) | Thin HTTP wrapper, similar API surface |
| `google.golang.org/grpc` | `tonic` | Already used in all three Rust services |
| `encoding/json` dispatch | `serde` + `serde_json` | More ergonomic with derived `Deserialize` on typed enums |

---

## Structural design

```
apps/asyncservice/
├── build.rs                  # tonic-build proto compilation
├── Cargo.toml
└── src/
    ├── main.rs               # wiring: DB pool, Kafka clients, Valkey, Meili, spawn tasks, start gRPC server
    ├── cogito.rs           # generated proto (via build.rs)
    ├── internal_auth.rs      # internal-token interceptor (copy from authservice)
    ├── logging.rs            # tracing setup (copy from authservice)
    ├── search/
    │   ├── mod.rs
    │   ├── controller.rs     # SearchService gRPC impl → calls meili.rs
    │   └── meili.rs          # Meilisearch HTTP client, index provisioning, scoped key
    ├── notifications/
    │   ├── mod.rs
    │   ├── controller.rs     # NotificationService gRPC impl → calls db.rs
    │   ├── consumer.rs       # Kafka consumer: activity + entity-changes → db.rs
    │   └── db.rs             # sqlx queries: insert, mark_read, list, unread_count, delete_by_*
    └── feed/
        ├── mod.rs
        ├── consumer.rs       # Kafka consumer: activity → fan-out to db.rs, cache.rs
        ├── db.rs             # sqlx queries: insert feed rows, cleanup
        └── cache.rs          # Valkey follower-count cache
```

`main.rs` spawns three independent `tokio::spawn` tasks — notifications consumer, feed consumer, cleanup ticker — then starts the tonic server. All share the same `sqlx::PgPool`. Consumers use separate Kafka consumer group IDs.

---

## Key Rust patterns to learn here

### 1. Trait-based DB abstraction (testability)

The Go version uses interfaces (`Repository`) to allow fake implementations in tests. In Rust this becomes a trait:

```rust
#[async_trait]
pub trait NotificationDb: Send + Sync + 'static {
    async fn insert(&self, external_id: i64, user_id: i32, actor_id: i32,
                    notif_type: &str, entity_id: &str) -> Result<(), sqlx::Error>;
    async fn mark_read(&self, id: i64, user_id: i32) -> Result<bool, sqlx::Error>;
    async fn list(&self, user_id: i32, cursor: &str, limit: i32)
        -> Result<(Vec<Notification>, String), sqlx::Error>;
    async fn unread_count(&self, user_id: i32) -> Result<i32, sqlx::Error>;
    async fn delete_by_entity(&self, entity_id: &str, types: &[&str]) -> Result<(), sqlx::Error>;
    async fn delete_by_actor_and_type(&self, actor_id: i32, recipient_id: i32,
                                       notif_type: &str, entity_id: &str) -> Result<(), sqlx::Error>;
}
```

`Controller<D: NotificationDb>` is generic over that trait — identical pattern to authservice's `Controller<D: AuthDb>`. Fake implementations in `#[cfg(test)]` modules cover the gRPC handler without a real DB.

### 2. Serde for event dispatch

Replace the Go `map[string]json.RawMessage` + manual field extraction with typed structs:

```rust
#[derive(Deserialize)]
#[serde(tag = "op", rename_all = "snake_case")]
enum ActivityEvent {
    Like     { _outbox_id: i64, actor_id: i32, recipient_id: i32, post_id: i64 },
    Unlike   { actor_id: i32, recipient_id: i32, post_id: i64 },
    Repost   { _outbox_id: i64, actor_id: i32, recipient_id: i32, post_id: i64 },
    Unrepost { actor_id: i32, recipient_id: i32, post_id: i64 },
    Reply    { _outbox_id: i64, actor_id: i32, recipient_id: i32, reply_post_id: i64 },
    Unreply  { reply_post_id: i64 },
    Follow   { _outbox_id: i64, actor_id: i32, recipient_id: i32 },
    Unfollow { actor_id: i32, recipient_id: i32 },
    #[serde(other)]
    Unknown,
}
```

`serde_json::from_slice(record.payload())` gives you a typed enum with no manual field extraction. Unrecognised `op` values match `Unknown` and are logged + skipped cleanly.

### 3. Kafka consumer loop in tokio

`rdkafka` provides a `StreamConsumer` that integrates with tokio:

```rust
loop {
    match consumer.recv().await {
        Err(e) => {
            tracing::warn!(error = %e, "kafka recv failed");
        }
        Ok(msg) => {
            let payload = msg.payload().unwrap_or_default();
            if let Err(e) = dispatch(&db, payload).await {
                tracing::warn!(
                    topic = msg.topic(), partition = msg.partition(),
                    offset = msg.offset(), error = %e,
                    "event processing failed"
                );
                // at-least-once: stop here, do not commit, let the message replay
                break;
            }
            consumer.commit_message(&msg, CommitMode::Async).ok();
        }
    }
}
```

Each consumer runs in its own `tokio::spawn` task. A panic or error in one does not affect the other or the gRPC server.

### 4. Multiple gRPC services on one tonic server

```rust
Server::builder()
    .add_service(SearchServiceServer::with_interceptor(
        search_ctrl, auth_interceptor.clone(),
    ))
    .add_service(NotificationServiceServer::with_interceptor(
        notif_ctrl, auth_interceptor,
    ))
    .serve(addr)
    .await?;
```

Tonic handles multiplexing. Still port 5050 — no change to the gateway or K8s manifests.

### 5. Graceful shutdown

```rust
let (shutdown_tx, _) = tokio::sync::broadcast::channel::<()>(1);

tokio::spawn(notif_consumer.run(shutdown_tx.subscribe()));
tokio::spawn(feed_consumer.run(shutdown_tx.subscribe()));
tokio::spawn(cleanup_task.run(shutdown_tx.subscribe()));

tokio::signal::ctrl_c().await?;
shutdown_tx.send(()).ok();
server.shutdown().await;
```

Each consumer holds a `broadcast::Receiver<()>` and selects on it in the poll loop with `tokio::select!`. Cleaner than Go's `context.Done()` — broadcast lets you fan out the signal without sharing a single channel.

---

## What changes in the rest of the system

| Location | Change |
|---|---|
| `apps/searchservice/` | Delete |
| `apps/eventsservice/` | Delete |
| `apps/asyncservice/` | Add |
| `AGENTS.md` service table | One row instead of two |
| `pkg/pb/cogito.proto` | No change — same two gRPC services, same field numbers |
| `apps/apigateway/api/router.go` | `EVENTS_SERVICE_ADDR` + `SEARCH_SERVICE_ADDR` → single `ASYNC_SERVICE_ADDR` (or keep two env vars pointing to the same address) |
| `Makefile` proto target | Add `asyncservice`, remove `searchservice` and `eventsservice` entries |
| `deploy/` K8s manifests | One Deployment/Service instead of two |
| `docs/infrastructure.md` | Update service table, env vars section |
| `docs/architecture.md` | Update service topology table and request flow |
| `README.md` | Update service table and architecture diagram |

---

## Main risks to think through before starting

**At-least-once delivery and idempotency** — the notifications consumer already handles this (`ON CONFLICT (external_id) DO NOTHING` on insert). Audit the feed consumer: if a message is processed twice, does a second fan-out insert duplicate feed rows? Check that the `feed` table's `(user_id, post_id)` primary key constraint makes fan-out inserts idempotent.

**Fan-out at N replicas** — two asyncservice replicas means two consumers in the same Kafka consumer group. Kafka partitioning ensures each partition is owned by one consumer at a time, so fan-out won't duplicate. Verify partition count ≥ intended replica count, or you'll have idle replicas on the consumer side.

**Meilisearch sync ownership** — currently Redpanda Connect pipelines handle `entity-changes` → Meilisearch sync, not searchservice. If you want to pull that into asyncservice (making Connect purely a CDC relay), that's a larger scope but cleaner overall: all "what do events mean" logic in one place. If you leave it in Connect, asyncservice just adds Meilisearch queries (read path) with no sync responsibility. Decide scope before starting.

**Scoped Meilisearch key provisioning** — the Go searchservice provisions a scoped API key on startup (idempotent, fixed UID). Port this to Rust startup as a blocking `reqwest` call before the server starts accepting traffic. The official `meilisearch-sdk` crate supports key management.

**Replica count** — searchservice ran at `replicas: 2`, eventsservice at `replicas: 1`. Pick a single value. `replicas: 2` is safe for all three roles (gRPC queries are stateless, consumers partition-balanced, cleanup task uses `DELETE ... WHERE` which is idempotent).

---

## Why this is good for learning Rust

This service covers the most practically useful parts of async Rust in one place:

- **Traits + generics** for DB abstraction and testability (`Controller<D: Db>`)
- **serde** for structured event deserialization (tagged enums, `#[serde(other)]`)
- **tokio** tasks for concurrent I/O without threads
- **tonic** for multiple gRPC services on one server with interceptors
- **sqlx** for async PostgreSQL (compile-time query verification optional but available)
- **broadcast channels** for clean multi-consumer shutdown
- **rdkafka** for a real Kafka consumer with manual commit

The domain logic is straightforward enough that you're learning the language and runtime, not fighting the business rules. And the patterns here (trait-based injection, typed event dispatch, task fan-out) are directly reusable across any future Rust service.
