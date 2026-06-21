# Thoughts: Infrastructure TODO

Four phases in dependency order. P1 and P2 are independent (can be done in parallel). P3 requires P1+P2 deployed and migration 000006 applied. P4 requires P3 fully deployed.

---

## P1 — SeaweedFS (imageservice)

Replace PVC-backed local disk with S3-compatible blob store. imageservice becomes stateless and HA-ready.

### Rust — imageservice

- [ ] `apps/imageservice/Cargo.toml`: add `aws-sdk-s3 = "1"`, `aws-config = { version = "1", features = ["behavior-version-latest"] }`, `bytes = "1"`; remove `tower-http` `fs` feature if only used for `ServeDir`
- [ ] `apps/imageservice/src/blobstore.rs` (new): `BlobStore` trait with `put(key, content_type, Bytes)`, `get(key) → Option<(Bytes, String)>`, `delete(key)`; `S3BlobStore` impl: `force_path_style(true)`, 10s timeout, auto-create bucket at startup (`create_bucket`, ignore `BucketAlreadyOwnedByYou`)
- [ ] `apps/imageservice/src/http.rs`: remove `ServeDir` nest and `tokio::fs` imports; `AppState` holds `blobstore: Arc<dyn BlobStore>` instead of `image_dir`; add `GET /uploads/:filename` handler (validate key, call `blobstore.get`, stream with `Content-Type` + cache header, 404 on `None`); upload handler: accumulate multipart chunks into `Bytes`, validate magic bytes, generate UUID, call `blobstore.put("staging/{uuid}.{ext}")`, insert DB record with final key `{uuid}.{ext}`
- [ ] `apps/imageservice/src/grpc.rs`: `ImageGrpcService` holds `blobstore: Arc<dyn BlobStore>` (no `image_dir`); `ConsumeUpload`: `CopyObject staging/{filename} → {filename}` + `DeleteObject staging/{filename}`; `DeleteImage`: `blobstore.delete(filename)` + `blobstore.delete("staging/{filename}")`; path-traversal check (no `/..`, no leading `/`) before all S3 calls
- [ ] `apps/imageservice/src/main.rs`: read `S3_ENDPOINT`, `S3_BUCKET`, `S3_REGION`, `S3_ACCESS_KEY`, `S3_SECRET_KEY`; build `Arc<S3BlobStore>`; remove `IMAGE_DIR` read and `fs::create_dir_all`; pass blobstore to both http router and gRPC service
- [ ] Run `cargo test` for imageservice; verify upload → consume → serve → delete lifecycle

### Kubernetes

- [ ] `deploy/storage.yaml` (new): SeaweedFS `StatefulSet` (image: `chrislusf/seaweedfs`; args: `["server", "-s3", "-s3.config=/etc/seaweed/s3.json"]`; port 8333); headless `Service`; `ConfigMap` with `s3.json` credentials; 5 GiB `PersistentVolumeClaim`
- [ ] `deploy/imageservice.yaml`: remove `IMAGE_DIR` env, `volumeMounts` section, `volumes` section; add `S3_ENDPOINT=http://seaweedfs:8333`, `S3_BUCKET=thoughts-images`, `S3_REGION=us-east-1`, `S3_ACCESS_KEY`/`S3_SECRET_KEY` from secret keys `s3-access-key`/`s3-secret-key`
- [ ] `deploy/imagevolume.yaml`: delete file
- [ ] Add `s3-access-key` and `s3-secret-key` to `thoughts-db-secret` (deployment step)

### Verification

- [ ] Deploy SeaweedFS and imageservice at 2 replicas
- [ ] Upload an image → returns `{ filename: "abc.jpg" }`; both pods serve same bytes from SeaweedFS
- [ ] `uploads` DB row deleted after `ConsumeUpload`; `staging/abc.jpg` key gone from SeaweedFS
- [ ] `DELETE /posts/{id}` with media → `DeleteImage` gRPC removes key from SeaweedFS

---

## P2 — Dragonfly (apigateway)

Move rate limiting from Postgres to Dragonfly. Drop the `rate_limits` table.

### Go — apigateway

- [ ] `apps/apigateway/go.mod`: add `github.com/valkey-io/valkey-go`; run `go mod tidy`
- [ ] `apps/apigateway/api/rate_limiter.go`:
  - Extract `RateLimiterStore interface { Allow(ctx, identifier string, policy RateLimitPolicy) (RateLimitDecision, error) }`
  - Add `DragonflyStore` struct (holds `valkey.Client` + Lua script SHA + `failOpen bool`)
  - `NewDragonflyStore()`: read `DRAGONFLY_URL`, `RATE_LIMIT_FAIL_OPEN`; create valkey client; `SCRIPT LOAD` the Lua token-bucket script; store resulting SHA
  - Lua script: `HMGET {tokens, last}`; refill based on elapsed ms × rate; deduct 1 if allowed; `HSET` new state; `PEXPIRE` with `burst/rate * 2s` TTL; return `{1|0, retry_ms}`
  - `DragonflyStore.Allow`: `EVALSHA sha 1 key burst rate now_ms`; parse `{allowed, retry_ms}` array; on error return `{Allowed: failOpen}`
  - Update `rateLimitPolicy`: add `typeahead` policy (`Burst: envInt("RATE_LIMIT_TYPEAHEAD_BURST", 20)`, `Rate: envFloat("RATE_LIMIT_TYPEAHEAD_RATE", 5)`) matching `(r.Method == http.MethodGet && (r.URL.Path == "/users/search" || r.URL.Path == "/hashtags/search"))` — placed **before** the generic GET read branch
  - Remove `PostgresRateLimiterStore`, `Cleanup` method
- [ ] `apps/apigateway/api/server.go`:
  - Change `rateLimitMiddleware` parameter type from `*PostgresRateLimiterStore` to `RateLimiterStore`
  - Replace `NewPostgresRateLimiterStore()` with `NewDragonflyStore()`
  - Remove `startRateLimitCleanup` call and function body
- [ ] Run `go test ./...` for apigateway; update `rate_limiter_test.go` for new interface

### Database

- [ ] `apps/database/migrations/000007_drop_rate_limits.up.sql`: `DROP TABLE IF EXISTS rate_limits;`
- [ ] `apps/database/migrations/000007_drop_rate_limits.down.sql`: `CREATE UNLOGGED TABLE rate_limits (id varchar(255) PRIMARY KEY, tokens integer NOT NULL, last_updated timestamptz NOT NULL DEFAULT now());`

### Kubernetes

- [ ] `deploy/cache.yaml` (new): Dragonfly `StatefulSet` (image: `docker.dragonflydb.io/dragonflydb/dragonfly`; args: `["--maxmemory=200mb"]`; port 6379; 256 MiB memory limit; 1 GiB PVC); headless `Service`
- [ ] `deploy/apigateway.yaml`: remove `DATABASE_URL` env var; add `DRAGONFLY_URL=redis://dragonfly:6379` and `RATE_LIMIT_FAIL_OPEN=true`

### Verification

- [ ] 6 rapid `POST /sessions` → 6th returns 429 with `Retry-After` header
- [ ] `redis-cli -h dragonfly HGETALL strict:ip:x.x.x.x` shows token count
- [ ] `psql`: `rate_limits` table does not exist
- [ ] Kill Dragonfly → requests pass through (fail-open); gateway does not error

---

## P3 — Hashtags + Typeahead

Apply migration 000006. Fix postservice. Wire transactional hashtag writes. Add hashtag typeahead. Add `/search` page.

**Prerequisite:** migration 000006 applied to the database before deploying updated postservice.

### postservice — Go

- [ ] `apps/postservice/post/utils.go`:
  - Add `"regexp"` and `"strings"` to the import block (fixes compile error)
  - Rename `hashtagPattern` → `extractPattern` (avoids collision with validation var in controller.go)
  - Update extraction regex to `(?:^|[^A-Za-z0-9_])#([A-Za-z0-9_]{1,50})` (consistent with controller.go's existing pattern; group 1 is the tag)
  - Add `var validTagPattern = regexp.MustCompile(`^[A-Za-z0-9_]{1,50}$`)` and `func ValidateHashtag(tag string) bool { return validTagPattern.MatchString(tag) }`
- [ ] `apps/postservice/post/controller.go`:
  - Remove `hashtagPattern`, `extractHashtagsPattern`, `extractHashtags` function
  - Remove `"regexp"` and `"strings"` from imports
  - Replace `!hashtagPattern.MatchString(req.Tag)` with `!ValidateHashtag(req.Tag)` in `GetHashtagPosts`
  - Replace `tags := extractHashtags(req.Content)` with `tags := ExtractHashtags(req.Content)` in `CreatePost`
  - Add `SearchHashtags` handler: validate `req.Query` not empty; clamp `req.Limit` to 1–20 (default 8); call `c.dbClient.searchHashtags(ctx, req.Query, limit)`; map rows to `[]*pb.Hashtag`; return `&pb.Hashtags{Hashtags: tags}`
- [ ] `apps/postservice/post/db_client.go`:
  - `createPost`: wrap in explicit `pgx` transaction; INSERT post **without** `hashtags` column; once: `INSERT INTO search_outbox(entity_type, entity_id) VALUES('post', $postID::text)`; per tag: `INSERT INTO hashtags(name) VALUES($tag) ON CONFLICT(name) DO NOTHING`, `INSERT INTO post_hashtags(post_id, hashtag_id) SELECT $postID, id FROM hashtags WHERE name=$tag ON CONFLICT DO NOTHING`, `INSERT INTO search_outbox(entity_type, entity_id) SELECT 'hashtag', id::text FROM hashtags WHERE name=$tag`; `SELECT pg_notify('search_outbox', '')`; `tx.Commit(ctx)`. Add `"strconv"` to imports.
  - `deletePost`: wrap in explicit transaction; `INSERT INTO search_outbox('post', $postID::text)` **before** the DELETE (worker finds it gone → removes from Meilisearch); `DELETE FROM posts WHERE id=$1 AND user_id=$2`; `SELECT pg_notify('search_outbox', '')`; `tx.Commit(ctx)`
  - `getHashtagPosts`: replace `WHERE hashtags @> ARRAY[$2]::varchar[]` with JOIN: `JOIN post_hashtags ph ON ph.post_id = p.id JOIN hashtags h ON h.id = ph.hashtag_id WHERE h.name = $2`; update column list to remove all `hashtags` column references
  - `searchHashtags` (new): `SELECT h.id, h.name, COUNT(ph.post_id)::int AS post_count FROM hashtags h LEFT JOIN post_hashtags ph ON ph.hashtag_id = h.id WHERE h.name % $1 OR h.name ILIKE $2 GROUP BY h.id ORDER BY similarity(h.name, $1) DESC, post_count DESC LIMIT $3`; params: `strings.ToLower(query)`, `strings.ToLower(query)+"%"`, `limit`; map rows to `[]*pb.Hashtag`
- [ ] Run `go test ./...` and `CGO_ENABLED=0 go build .` for postservice

### userservice — Rust

- [ ] `apps/userservice/src/db_client.rs` — `create_user`: replace `fetch_one(&self.pool)` with an explicit `sqlx` transaction: `begin`, INSERT RETURNING id, `INSERT INTO search_outbox(entity_type, entity_id) VALUES('user', $1)` with `id.to_string()`, `SELECT pg_notify('search_outbox', '')`, `commit`
- [ ] `apps/userservice/src/db_client.rs` — `update_user`: wrap UPDATE in transaction; add outbox insert + pg_notify after UPDATE; commit
- [ ] Run `cargo test` for userservice

### Proto

- [ ] `pkg/pb/thoughts.proto`: add `message Hashtag { int32 id = 1; string name = 2; int32 post_count = 3; }`, `message Hashtags { repeated Hashtag hashtags = 1; }`, `message SearchHashtagsRequest { string query = 1; int32 limit = 2; }`; add to `PostService`: `rpc SearchHashtags(SearchHashtagsRequest) returns (Hashtags);`
- [ ] Run `make proto` to regenerate `genproto/` for apigateway and postservice

### apigateway — Go

- [ ] `apps/apigateway/api/models.go`: add `type hashtag struct { ID int32 \`json:"id"\`; Name string \`json:"name"\`; PostCount int32 \`json:"postCount"\` }`
- [ ] `apps/apigateway/api/mappers.go`: add `func mapHashtag(h *pb.Hashtag) hashtag { return hashtag{ID: h.Id, Name: h.Name, PostCount: h.PostCount} }`
- [ ] `apps/apigateway/api/post_controller.go`: add `searchHashtags` handler: parse `q` and `limit` query params; validate `q` not empty; call `PostServiceClient.SearchHashtags`; build `[]hashtag` with a for loop using `mapHashtag`; return `jsonResponse(w, http.StatusOK, map[string][]hashtag{"items": tags})`
- [ ] `apps/apigateway/api/router.go`: add `mux.HandleFunc("GET /hashtags/search", r.post.searchHashtags)` (after existing hashtag route)
- [ ] Run `go test ./...` and `CGO_ENABLED=0 go build .` for apigateway

### Frontend

- [ ] `apps/frontend/src/lib/domains/posts/components/FormattedContent.svelte`: change hashtag `href` from `` `/hashtags/${encodeURIComponent(tagOrUserStr.toLowerCase())}` `` to `` `/search?q=%23${tagOrUserStr.toLowerCase()}` ``
- [ ] `apps/frontend/src/lib/domains/posts/components/CreatePost.svelte`:
  - Add reactive state: `hashtagSuggestions = $state<{id:number,name:string,postCount:number}[]>([])`, `hashtagQuery = $state("")`, `showHashtagTypeahead = $state(false)`
  - In `handleChange`: add detection of `(?:^|\s)#([A-Za-z0-9_]*)$` before cursor; set `hashtagQuery` / `showHashtagTypeahead` (mutually exclusive with `@mention` typeahead)
  - Add `$effect` for hashtag debounce (200ms) → fetch `/api/hashtags/search?query=...&limit=5` → set `hashtagSuggestions`
  - Add `handleSelectHashtag(name: string)`: replace `#partial` at cursor with `#name ` using same cursor-replacement logic as `handleSelectSuggestion`
  - Add hashtag dropdown in template (same styling as user dropdown): show when `showHashtagTypeahead && hashtagSuggestions.length > 0`; each entry shows `#name` and post count
- [ ] `apps/frontend/src/routes/api/hashtags/search/+server.ts` (new): BFF GET endpoint; read `query` param; call `GET /hashtags/search?q=...&limit=...` via `apiClient(event)`; return `json({ items })` on success, `json({ items: [] })` on error
- [ ] `apps/frontend/src/lib/domains/posts/api.server.ts`: add `searchHashtags(api: ApiClient, query: string, limit = 5): Promise<{items: Hashtag[]}>` (same pattern as `searchUsers` in users/api.server.ts); add `Hashtag` interface `{ id: number; name: string; postCount: number }`
- [ ] `apps/frontend/src/routes/(app)/search/+page.server.ts` (new): `load` function reads `?q` and `?tab` (default `posts`); calls appropriate API for initial SSR; returns `{ q, tab, items, hasMore }`
- [ ] `apps/frontend/src/routes/(app)/search/+page.svelte` (new):
  - Tab UI: Posts / Users / Hashtags; tabs navigate via `?tab=` URL param
  - Search input: updates `?q=` URL param on submit / Enter; debounced 300ms `$effect` for client-side re-query
  - Posts tab: when q starts with `#tag`, call `GET /hashtags/{tag}/posts`; otherwise show empty state (full-text search comes in P4)
  - Users tab: call existing `GET /users/search?q=...` via `searchUsers`
  - Hashtags tab: call `GET /hashtags/search?q=...` via `searchHashtags`
  - Load-more: `createPagination` for the active tab
  - Reuse `PostList`, `UserList` components; add inline hashtag list rendering for Hashtags tab
- [ ] `apps/frontend/src/lib/shared/components/layout/Navbar.svelte`: add Search nav link to `/search`
- [ ] Run `npm run lint` and `npm run build` for frontend

### Verification

- [ ] Create post with `#golang` → `hashtags` and `post_hashtags` rows exist in DB; `search_outbox` has entries for post and hashtag
- [ ] `GET /hashtags/golang/posts` returns the post
- [ ] `GET /hashtags/search?q=go` returns hashtag suggestions
- [ ] Type `#go` in compose textarea → dropdown shows hashtag suggestions; select inserts `#golang `
- [ ] Click `#golang` link in a rendered post → navigates to `/search?q=%23golang`
- [ ] `/search?q=%23golang` shows posts and hashtag tab works
- [ ] Delete post with hashtag → `search_outbox` row inserted; post gone from DB

---

## P4 — Meilisearch searchservice

New Go gRPC service owning the Meilisearch index. Outbox worker + startup backfill. Replaces Postgres-backed typeahead.

### Proto

- [ ] `pkg/pb/thoughts.proto`: add `message SearchRequest { string query = 1; int32 limit = 2; int32 offset = 3; }`; add `service SearchService { rpc SearchUsers(SearchRequest) returns (Users); rpc SearchPosts(SearchRequest) returns (Posts); rpc SearchHashtags(SearchRequest) returns (Hashtags); }`
- [ ] `Makefile`: add `searchservice` to the `proto` target's protoc calls; add `.PHONY: searchservice` build target (deps: proto; docker build)
- [ ] `Makefile` `all` target: add `searchservice`
- [ ] `Makefile` `format`/`lint`/`test` targets: add searchservice go paths
- [ ] Run `make proto`

### New `apps/searchservice/`

- [ ] `go.mod`: module `thoughts/searchservice`; deps: `github.com/jackc/pgx/v4`, `github.com/meilisearch/meilisearch-go`, `google.golang.org/grpc`, `google.golang.org/protobuf`
- [ ] `Dockerfile`: same pattern as postservice (multi-stage, scratch runtime, `CGO_ENABLED=0`)
- [ ] `search/meili.go` (`MeiliClient`):
  - Connect with master key; provision scoped API key (fixed UID so it's idempotent across restarts; actions: search + document writes + index reads); discard master key after provisioning
  - Create indexes if absent: `users` (searchable: `[username, name]`), `posts` (searchable: `[content, username]`, filterable: `[hashtags]`, sortable: `[created_at]`), `hashtags` (searchable: `[name]`, sortable: `[post_count]`)
  - HTTP client: 5s timeout, 1 MiB response limit
  - Methods: `UpsertUsers(docs)`, `UpsertPosts(docs)`, `UpsertHashtags(docs)`, `DeleteDoc(index, id string)`
  - Document shape — user: `{id, username, name}`; post: `{id, content, username, hashtags:[], created_at}`; hashtag: `{id, name, post_count}`
- [ ] `search/worker.go` (`Run(ctx, db, meili)`):
  - Dedicated pg connection for `LISTEN search_outbox`
  - Loop: select on notification or backoff timer (1s–30s exponential)
  - `drainBatch` in 30s-timeout transaction: `SELECT DISTINCT ON (entity_type, entity_id) id, entity_type, entity_id, attempts FROM search_outbox ORDER BY entity_type, entity_id, id DESC FOR UPDATE SKIP LOCKED LIMIT 100`
  - Per row: fetch current entity from Postgres; if found → upsert to Meilisearch; if not found → `DeleteDoc`; on success → `DELETE FROM search_outbox WHERE id=$1`; on failure → `UPDATE search_outbox SET attempts=attempts+1 WHERE id=$1`; if `attempts >= 5` → delete and log warning (give up)
  - Reset backoff to 1s after successful non-empty batch
- [ ] `search/db_client.go`:
  - `DrainOutbox(ctx, tx)`: the SELECT FOR UPDATE SKIP LOCKED query
  - `GetUser(ctx, db, id)`: lightweight select for Meilisearch doc
  - `GetPost(ctx, db, id)`: select with hashtag join for `hashtags` filterable field
  - `GetHashtag(ctx, db, id)`: select with post count
  - `StreamUsers(ctx, db, offset, limit)`, `StreamPosts(ctx, db, offset, limit)`, `StreamHashtags(ctx, db, offset, limit)`: batch queries for backfill
  - `TryAcquireBackfillLock(ctx, conn) bool`: `SELECT pg_try_advisory_lock(774191)`
  - `ReleaseBackfillLock(ctx, conn)`: `SELECT pg_advisory_unlock(774191)`
- [ ] `search/controller.go`: implement `SearchServiceServer`; `SearchUsers/Posts/Hashtags`: validate query (non-empty, max 255 chars), clamp offset/limit (0–1000 / 1–50), call `meili.Search*`; map results to proto types; internal token interceptor (same pattern as other services)
- [ ] `main.go`: connect Postgres pool (max 5 conns) → provision Meilisearch → `go runBackfill(ctx, db, meili)` (advisory lock, batch 500 per entity type) → `go worker.Run(ctx, db, meili)` → gRPC server on port 5050 with graceful shutdown
- [ ] Run `go test ./...` and `CGO_ENABLED=0 go build .` for searchservice

### apigateway — Go

- [ ] `apps/apigateway/api/server.go`: add `searchAddr` parameter to `CreateServer`; construct `SearchServiceClient` gRPC connection; pass to `newRouter`
- [ ] `apps/apigateway/api/router.go`: add `search *searchController` to `router` struct; add `mux.HandleFunc("GET /search", r.search.search)` route; update `newRouter` to accept and wire searchservice client
- [ ] `apps/apigateway/api/search_controller.go` (new): `search` handler: parse `q`, `type` (users|posts|hashtags), `page` (int, default 0) params; dispatch to `SearchServiceClient.SearchUsers/Posts/Hashtags` with `offset = page * limit`; return `{"items": [...], "hasMore": bool}`
- [ ] `apps/apigateway/api/user_controller.go`: update `searchUsers` handler to call `SearchServiceClient.SearchUsers` instead of `UserServiceClient.SearchUsers`
- [ ] `apps/apigateway/api/post_controller.go`: update `searchHashtags` handler to call `SearchServiceClient.SearchHashtags` instead of `PostServiceClient.SearchHashtags`
- [ ] Run `go test ./...` and `CGO_ENABLED=0 go build .` for apigateway

### Frontend

- [ ] `apps/frontend/src/routes/(app)/search/+page.svelte`: update Posts tab to use `GET /search?q=...&type=posts` (full-text via searchservice); update Users tab to use `GET /search?q=...&type=users`; update Hashtags tab to use `GET /search?q=...&type=hashtags`; remove direct `searchUsers`/`searchHashtags` domain API calls from this page (all go through unified `/search` gateway endpoint)
- [ ] `apps/frontend/src/routes/api/users/search/+server.ts`: update to call `GET /search?q=...&type=users&limit=...` (or keep calling `/users/search` for typeahead — gateway now routes it to searchservice)
- [ ] `apps/frontend/src/routes/api/hashtags/search/+server.ts`: update to call `GET /search?q=...&type=hashtags&limit=...` (or keep `/hashtags/search` — gateway routes it to searchservice)

### Kubernetes

- [ ] `deploy/search.yaml` (new): Meilisearch `StatefulSet` (image: `getmeili/meilisearch`; env: `MEILI_ENV=production`, `MEILI_MASTER_KEY` from secret; port 7700; HTTP readiness probe `GET /health`; 512 MiB memory; 1 GiB PVC); `Service`
- [ ] `deploy/searchservice.yaml` (new): `Deployment` (image: `localhost:5000/thoughts/searchservice`; replicas: 2; env: `DATABASE_URL`, `MEILI_HOST=http://meilisearch:7700`, `MEILI_MASTER_KEY`, `INTERNAL_GRPC_TOKEN`; port 5050; TCP liveness/readiness probes; 128 MiB memory limit); `Service`
- [ ] `deploy/apigateway.yaml`: add `SEARCH_SERVICE_ADDR=searchservice:5050`
- [ ] Add `meili-master-key` to `thoughts-db-secret` (deployment step)

### Verification

- [ ] Post with `#meilisearch` → check Meilisearch `hashtags` index entry appears within ~1s
- [ ] `GET /search?q=meili&type=hashtags` returns the hashtag
- [ ] `GET /search?q=content+text&type=posts` returns full-text matched posts
- [ ] `GET /search?q=username&type=users` returns Meilisearch results (not Postgres LIKE)
- [ ] Scale searchservice to 0, back to 2 → backfill runs; all data re-indexed; advisory lock prevents duplicate backfill
- [ ] Kill Meilisearch → writes still succeed; search returns empty; `search_outbox` accumulates; restore Meilisearch → worker drains backlog
