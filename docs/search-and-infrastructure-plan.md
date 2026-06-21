# Thoughts: Search and Infrastructure — Implementation Plan

## Context

The thoughts microservices app needs four infrastructure upgrades defined in `docs/search-and-infrastructure-plan.md`. The pixelgram project is the reference implementation (monolithic Go backend). This plan adapts those patterns to thoughts' microservices architecture (Go apigateway + postservice, Rust userservice + imageservice).

**Current blockers:**
- `apps/postservice/post/utils.go` references `regexp` and `strings` without importing them — compile error
- `post/db_client.go` writes to the dropped `hashtags[]` column and queries it with array containment — both broken after migration 000006 runs
- `imageservice` uses local PVC-backed disk — not HA-safe
- apigateway rate limiter uses Postgres — coupling rate state to the primary datastore

Migration 000006 is already written and ready to apply. It creates `hashtags`, `post_hashtags`, `search_outbox`, drops `posts.hashtags[]`, adds `pg_trgm` indexes.

---

## Phase 1: SeaweedFS (imageservice — Rust)

Replace local disk with S3-compatible blob store. imageservice becomes horizontally scalable with zero local state.

### Staging contract
Upload stages to S3 key `staging/{uuid}.{ext}`. DB record stores the final key `{uuid}.{ext}`. `ConsumeUpload` copies `staging/{key}` → `{key}` then deletes the staging key (use `CopyObject` API + `DeleteObject`). `DeleteImage` removes `{key}` from S3. Both staging and final paths are validated against path traversal before any S3 call.

### Files to change

**`apps/imageservice/Cargo.toml`** — add `aws-sdk-s3 = "1"`, `aws-config = { version = "1", features = ["behavior-version-latest"] }`, `bytes = "1"`. Remove `tower-http` `fs` feature if only used for `ServeDir`.

**`apps/imageservice/src/blobstore.rs`** (new) — `BlobStore` trait (`put`, `get→Option`, `delete`); `S3BlobStore` impl:
- Build client with `force_path_style(true)` (SeaweedFS compatibility)
- 10-second operation timeout via `TimeoutConfig`
- Auto-create bucket at startup (`create_bucket`, ignore `BucketAlreadyOwnedByYou`)
- `put` takes `Bytes` (safe: bodies already capped at 1 MiB)
- `get` returns `None` on `NoSuchKey` — callers handle 404 cleanly
- Env vars: `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`

**`apps/imageservice/src/http.rs`** — remove `ServeDir` nest and `tokio::fs` writes; `AppState` holds `blobstore: Arc<dyn BlobStore>` instead of `image_dir`; add `GET /uploads/:filename` handler that calls `blobstore.get`, validates filename (no `/`, no `..`), streams bytes with correct `Content-Type` and cache header; upload handler accumulates chunks into `Bytes`, validates magic bytes, generates UUID, calls `blobstore.put("staging/{uuid}.{ext}")`, inserts DB record with final key.

**`apps/imageservice/src/grpc.rs`** — `ImageGrpcService` holds `blobstore: Arc<dyn BlobStore>` (no `image_dir`); `ConsumeUpload`: `CopyObject staging/{filename} → {filename}` then `DeleteObject staging/{filename}`; `DeleteImage`: `blobstore.delete(filename)` + `blobstore.delete("staging/{filename}")` (belt-and-suspenders); path-traversal check before both.

**`apps/imageservice/src/main.rs`** — read S3 env vars; build `Arc<S3BlobStore>`; remove `IMAGE_DIR` and `fs::create_dir_all`; pass blobstore to both `http::create_router` and `grpc::ImageGrpcService::new`.

**`deploy/storage.yaml`** (new) — SeaweedFS `StatefulSet` + headless `Service`; `weed server -s3 -s3.config=/etc/seaweed/s3.json`; S3 credentials in a `ConfigMap`; 5 GiB PVC; port 8333 exposed.

**`deploy/imageservice.yaml`** — remove `IMAGE_DIR` env, `volumeMounts`, `volumes`; add `S3_ENDPOINT=http://seaweedfs:8333`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`/`S3_SECRET_KEY` from secret keys `s3-access-key`/`s3-secret-key`.

**`deploy/imagevolume.yaml`** — delete file.

### Verification
Scale imageservice to 2 replicas. Upload an image. Both pods serve the same bytes via SeaweedFS. No `IMAGE_DIR` in env. `uploads` DB row deleted after `ConsumeUpload`. `staging/` key gone from SeaweedFS.

---

## Phase 2: Dragonfly (apigateway — Go)

Move rate limiting from Postgres to Dragonfly. Decouple rate state from the primary datastore. Remove the `rate_limits` table.

### Rate limit interface

Extract `RateLimiterStore` interface from the concrete type so `server.go` and `rateLimitMiddleware` are decoupled from the implementation:

```go
type RateLimiterStore interface {
    Allow(ctx context.Context, identifier string, policy RateLimitPolicy) (RateLimitDecision, error)
}
```

### Lua token-bucket script

Stored as SHA via `SCRIPT LOAD`, called via `EVALSHA`. State is per-key `HSET {tokens, last_ms}` with `PEXPIRE TTL = burst/rate * 2s`. Returns `{1|0, retry_ms}`. Fails open (returns `Allowed: true`) when Dragonfly is unavailable and `RATE_LIMIT_FAIL_OPEN=true`.

Key hierarchy (unchanged from Postgres implementation): `policy:user:{id}` > `policy:session:{cookie}` > `policy:ip:{remoteAddr}`.

### Typeahead policy

Add `typeahead` policy (burst=20, rate=5/s) in `rateLimitPolicy` **before** the generic `GET` read branch, matching `GET /users/search` and `GET /hashtags/search`. This prevents per-keystroke Meilisearch hammering.

### Files to change

**`apps/apigateway/go.mod`** — add `github.com/valkey-io/valkey-go`.

**`apps/apigateway/api/rate_limiter.go`** — add `RateLimiterStore` interface; add `DragonflyStore` with Lua script, `SCRIPT LOAD` at construction time, `EVALSHA` per request; update `rateLimitPolicy` to add `typeahead` policy for the two search paths; keep all existing types/helpers unchanged. Remove `PostgresRateLimiterStore` and `Cleanup` method (TTL handles expiry).

**`apps/apigateway/api/server.go`** — change `rateLimitMiddleware` parameter to `RateLimiterStore`; replace `NewPostgresRateLimiterStore()` with `NewDragonflyStore()`; remove `startRateLimitCleanup` call and function.

**`apps/database/migrations/000007_drop_rate_limits.up.sql`** — `DROP TABLE IF EXISTS rate_limits;`

**`apps/database/migrations/000007_drop_rate_limits.down.sql`** — recreate `UNLOGGED TABLE rate_limits (id varchar(255) PRIMARY KEY, tokens integer NOT NULL, last_updated timestamptz NOT NULL DEFAULT now())`.

**`deploy/cache.yaml`** (new) — Dragonfly `StatefulSet` + `Service`; `--maxmemory=200mb`; 256 MiB memory limit; 1 GiB PVC.

**`deploy/apigateway.yaml`** — remove `DATABASE_URL`; add `DRAGONFLY_URL=redis://dragonfly:6379` and `RATE_LIMIT_FAIL_OPEN=true`.

### Verification
6 rapid `POST /sessions` → 6th returns 429 with `Retry-After`. `HGETALL strict:ip:x.x.x.x` in Dragonfly shows token count. `rate_limits` table absent. Kill Dragonfly, requests pass through (fail-open).

---

## Phase 3: Hashtags + Typeahead

Apply migration 000006. Fix postservice compile error. Wire transactional hashtag writes. Add `SearchHashtags` RPC. Add `#hashtag` typeahead in compose. Add `/search` page.

### postservice fixes

**`apps/postservice/post/utils.go`** — add `"regexp"` and `"strings"` to the import block (fixes compile error); rename `hashtagPattern` → `extractPattern` (avoids collision with validation var in controller.go); update regex to the stricter `(?:^|[^A-Za-z0-9_])#([A-Za-z0-9_]{1,50})` (consistent with controller.go's existing extraction pattern; group 1 is the tag); expose `ValidateHashtag(tag string) bool` using `^[A-Za-z0-9_]{1,50}$` so controller.go can use it.

**`apps/postservice/post/controller.go`** — remove `hashtagPattern`, `extractHashtagsPattern`, `extractHashtags` function, `"regexp"` and `"strings"` imports (no longer needed); replace `!hashtagPattern.MatchString(req.Tag)` with `!ValidateHashtag(req.Tag)` in `GetHashtagPosts`; replace `tags := extractHashtags(...)` with `tags := ExtractHashtags(...)` in `CreatePost`; add `SearchHashtags` handler (validate query, clamp limit 1–20, delegate to `dbClient.searchHashtags`).

**`apps/postservice/post/db_client.go`**:

`createPost` — explicit `pgx` transaction:
1. INSERT post without `hashtags` column → scan `id`
2. INSERT `search_outbox('post', post_id::text)` once
3. For each tag: `INSERT INTO hashtags(name) ON CONFLICT DO NOTHING`; `INSERT INTO post_hashtags(post_id, hashtag_id) SELECT $1, id FROM hashtags WHERE name=$2 ON CONFLICT DO NOTHING`; `INSERT INTO search_outbox('hashtag', id::text) SELECT id::text FROM hashtags WHERE name=$2`
4. `SELECT pg_notify('search_outbox', '')`
5. `tx.Commit`

`deletePost` — wrap existing `DELETE FROM posts` in a transaction; also `INSERT INTO search_outbox('post', post_id::text)` before the delete so the outbox worker finds the post gone and removes it from Meilisearch.

`getHashtagPosts` — replace `WHERE hashtags @> ARRAY[$2]::varchar[]` with JOIN:
```sql
FROM posts p
JOIN post_hashtags ph ON ph.post_id = p.id
JOIN hashtags h ON h.id = ph.hashtag_id
WHERE h.name = $2
```

`searchHashtags` (new) — `pg_trgm` similarity + prefix fallback:
```sql
SELECT h.id, h.name, COUNT(ph.post_id)::int AS post_count
FROM hashtags h
LEFT JOIN post_hashtags ph ON ph.hashtag_id = h.id
WHERE h.name % $1 OR h.name ILIKE $2
GROUP BY h.id
ORDER BY similarity(h.name, $1) DESC, post_count DESC
LIMIT $3
```
Pass `strings.ToLower(query)` as `$1` and `strings.ToLower(query)+"%"` as `$2`.

### userservice outbox writes (Rust)

**`apps/userservice/src/db_client.rs`**:

`create_user` — wrap in `pool.begin()` transaction; after the INSERT RETURNING id, add:
```rust
sqlx::query("INSERT INTO search_outbox (entity_type, entity_id) VALUES ('user', $1)")
    .bind(id.to_string()).execute(&mut *tx).await?;
sqlx::query("SELECT pg_notify('search_outbox', '')")
    .execute(&mut *tx).await?;
tx.commit().await?;
```

`update_user` — wrap in `pool.begin()` transaction; after UPDATE, add same outbox insert + pg_notify; commit.

### Proto changes

**`pkg/pb/thoughts.proto`** — add:
```protobuf
message Hashtag { int32 id = 1; string name = 2; int32 post_count = 3; }
message Hashtags { repeated Hashtag hashtags = 1; }
message SearchHashtagsRequest { string query = 1; int32 limit = 2; }
```
Add to `PostService`: `rpc SearchHashtags(SearchHashtagsRequest) returns (Hashtags);`

Run `make proto` to regenerate `genproto/` for apigateway and postservice.

### apigateway additions

**`apps/apigateway/api/models.go`** — add `type hashtag struct { ID int32 \`json:"id"\`; Name string \`json:"name"\`; PostCount int32 \`json:"postCount"\` }`.

**`apps/apigateway/api/mappers.go`** — add `mapHashtag(*pb.Hashtag) hashtag`.

**`apps/apigateway/api/post_controller.go`** — add `searchHashtags` handler: parse `q` + `limit` params, call `PostServiceClient.SearchHashtags`; build `[]hashtag` with a for loop using `mapHashtag`; return `jsonResponse(w, 200, map[string][]hashtag{"items": tags})`.

**`apps/apigateway/api/router.go`** — add `mux.HandleFunc("GET /hashtags/search", r.post.searchHashtags)`.

### Frontend

**`apps/frontend/src/lib/domains/posts/components/FormattedContent.svelte`** — update hashtag `href` from `/hashtags/${tag.toLowerCase()}` to `/search?q=%23${tag.toLowerCase()}` so hashtag clicks go to the new search page.

**`apps/frontend/src/lib/domains/posts/components/CreatePost.svelte`** — add `#hashtag` typeahead alongside existing `@mention` typeahead: detect `(?:^|\s)#([A-Za-z0-9_]*)$` before cursor; debounced 200ms fetch to `/api/hashtags/search?query=...&limit=5`; render dropdown with same styling as the user dropdown; `handleSelectHashtag` inserts the completed `#tag ` at cursor position.

**`apps/frontend/src/routes/api/hashtags/search/+server.ts`** (new) — BFF endpoint; reads `query` param; calls `GET /hashtags/search?q=...&limit=...` on the apigateway via `apiClient`; returns `{ items: Hashtag[] }`.

**`apps/frontend/src/lib/domains/posts/api.server.ts`** — add `searchHashtags(api, query, limit)` function (same pattern as `searchUsers` in users/api.server.ts).

**`apps/frontend/src/routes/(app)/search/+page.server.ts`** (new) — server load; reads `?q` and `?tab` (posts|users|hashtags, default posts); calls the appropriate API for initial SSR render; returns `{ q, tab, items, hasMore }`.

**`apps/frontend/src/routes/(app)/search/+page.svelte`** (new) — tab UI (Posts/Users/Hashtags); URL-driven state (`?q=&tab=`); debounced 300ms client-side re-query on input change using `$effect`; cursor-based load-more via `createPagination`; for Posts tab, queries `GET /hashtags/{tag}/posts` when q starts with `#`; for Users tab, queries existing `GET /users/search`; for Hashtags tab, queries new `GET /hashtags/search`; reuses `PostList`, `UserList` components.

**`apps/frontend/src/lib/shared/components/layout/Navbar.svelte`** — add Search link to `/search`.

### Verification
Compose post with `#golang` → `hashtags` and `post_hashtags` rows exist; `search_outbox` has entries. `GET /hashtags/golang/posts` returns the post. Type `#go` in compose → hashtag dropdown appears. Navigate to `/search?q=%23golang` → shows posts. Click hashtag in a post → routes to `/search?q=%23golang`.

---

## Phase 4: Meilisearch searchservice (Go gRPC)

New stateless Go gRPC service owning the Meilisearch index. Outbox worker + startup backfill. Replaces Postgres-backed typeahead with full-text search.

### Proto additions

**`pkg/pb/thoughts.proto`** — add:
```protobuf
message SearchRequest { string query = 1; int32 limit = 2; int32 offset = 3; }
service SearchService {
  rpc SearchUsers(SearchRequest) returns (Users);
  rpc SearchPosts(SearchRequest) returns (Posts);
  rpc SearchHashtags(SearchRequest) returns (Hashtags);
}
```

**`Makefile`** — add `searchservice` to proto target and add build target (pattern: proto dep + docker build).

Run `make proto`.

### New `apps/searchservice/`

Module: `thoughts/searchservice`. Dependencies: `pgx/v4`, `meilisearch-go`, `google.golang.org/grpc`.

**`search/meili.go`** — `MeiliClient`:
- Connect with master key; provision a scoped API key at startup (fixed UID, actions: search + document writes); store scoped key; master key not retained after init
- Configure three indexes (create if absent): `users` (searchable: `[username, name]`), `posts` (searchable: `[content, username]`, filterable: `[hashtags]`, sortable: `[created_at]`), `hashtags` (searchable: `[name]`, sortable: `[post_count]`)
- HTTP client: 5s timeout, 1 MiB response limit
- Methods: `UpsertUsers`, `UpsertPosts`, `UpsertHashtags`, `DeleteDoc(index, id)`

**`search/worker.go`** — `Run(ctx, db, meili)`:
- Dedicated connection for `LISTEN search_outbox` (immediate wakeup on `pg_notify`)
- Exponential backoff timer (1s–30s) as fallback
- `drainBatch`: `SELECT DISTINCT ON (entity_type, entity_id) id, entity_type, entity_id, attempts FROM search_outbox ORDER BY entity_type, entity_id, id DESC FOR UPDATE SKIP LOCKED LIMIT 100` within a 30s-timeout transaction
- For each row: read current entity state from Postgres; if found → upsert to Meilisearch; if not found → `DeleteDoc`; on success → `DELETE FROM search_outbox WHERE id=$id`; on failure → `UPDATE search_outbox SET attempts=attempts+1 WHERE id=$id`; after 5 attempts → delete row (give up, log warning)
- HA-safe: `SKIP LOCKED` ensures multiple replicas drain disjoint rows

**`search/db_client.go`** — outbox queries (above); backfill batch queries returning slim projections for each entity type (offset+limit); advisory lock: `pg_try_advisory_lock(774191)` / `pg_advisory_unlock(774191)` on a dedicated connection.

**`search/controller.go`** — gRPC handlers for `SearchUsers`, `SearchPosts`, `SearchHashtags`: validate query (max 255 chars), clamp limit (1–50), call `meili.Search*`, map results to proto types; require internal token via metadata interceptor (same as other services).

**`main.go`** — sequential startup: connect Postgres pool → connect Meilisearch → provision scoped key + setup indexes → start backfill goroutine (advisory lock, batch 500, upsert all entities) → start worker goroutine → serve gRPC on port 5050; graceful shutdown.

### apigateway additions

**`apps/apigateway/api/server.go`** — add `searchAddr` parameter to `CreateServer`; create `SearchServiceClient` gRPC client; update `newRouter` or pass client to a new `searchController`.

**`apps/apigateway/api/search_controller.go`** (new) — `GET /search?q=&type=users|posts|hashtags&page=`: dispatch to `SearchServiceClient.SearchUsers/Posts/Hashtags`; return `{ "items": [...], "hasMore": bool }`; update typeahead handlers `searchUsers` and `searchHashtags` to use `SearchServiceClient` instead of `UserServiceClient`/`PostServiceClient`.

**`apps/apigateway/api/router.go`** — add `mux.HandleFunc("GET /search", r.search.search)`.

### Frontend

**`apps/frontend/src/routes/(app)/search/+page.svelte`** — update Posts tab to use `GET /search?q=&type=posts` (full-text, not just hashtag posts). No other changes needed.

### Kubernetes

**`deploy/search.yaml`** (new) — Meilisearch `StatefulSet` + `Service`; `MEILI_ENV=production`; `MEILI_MASTER_KEY` from secret; 512 MiB memory limit; 1 GiB PVC; HTTP readiness probe on `:7700/health`.

**`deploy/searchservice.yaml`** (new) — `Deployment` (stateless, replicas: 2); env: `DATABASE_URL`, `MEILI_HOST=http://meilisearch:7700`, `MEILI_MASTER_KEY`, `INTERNAL_GRPC_TOKEN`; TCP liveness/readiness on port 5050.

**`deploy/apigateway.yaml`** — add `SEARCH_SERVICE_ADDR=searchservice:5050`.

**`thoughts-db-secret`** — add `meili-master-key` key (deployment step, not code).

### Verification
Post with `#meilisearch` → Meilisearch `hashtags` index has entry within ~1s. `GET /search?q=meili&type=hashtags` returns it. Restart searchservice → backfill re-indexes all data (advisory lock ensures only one replica runs it). `GET /search?q=user_text&type=posts` returns full-text matches. Typeahead calls now hit Meilisearch.

---

## Engineering invariants

- **No dual writes.** Every domain write + outbox insert is a single Postgres transaction.
- **HA outbox.** `SELECT FOR UPDATE SKIP LOCKED` prevents duplicate processing across replicas.
- **Backfill idempotent.** Advisory lock ensures only one searchservice replica runs backfill. Meilisearch upserts are safe to repeat.
- **Fail-open rate limiting.** Dragonfly outage must not bring down the gateway. `RATE_LIMIT_FAIL_OPEN=true`.
- **Meilisearch failure isolation.** Search degrades; writes are unaffected. Outbox re-queues on next drain cycle.
- **imageservice stateless.** After P1, no local filesystem state. Two replicas sharing SeaweedFS and the Postgres uploads table are correct by design.
- **Scoped Meilisearch key.** Master key only in searchservice env. All document operations use the scoped key.
- **entity_id is varchar(255).** Integer IDs stored as `strconv.Itoa` in Go, `.to_string()` in Rust.
- **Path traversal.** imageservice validates all keys before S3 calls (no `/..` components, no leading `/`).
- **`deletePost` outbox.** Outbox entry inserted in same transaction as the delete. Worker finds post gone → removes from Meilisearch.
