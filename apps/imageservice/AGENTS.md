# Image Service Instructions

These rules extend the repository-level `AGENTS.md` for `apps/imageservice/`.

## Boundaries

- `http.rs` owns upload and byte-serving HTTP behavior.
- `grpc.rs` owns image verification and lifecycle operations used by other
  services.
- `db_client.rs` owns PostgreSQL metadata; the configured image directory owns
  staged bytes.

## Upload and Lifecycle Safety

- Bound multipart bodies and every field before buffering. Enforce the hard
  upload limit in this service even when the gateway also limits requests.
- Validate content from magic bytes rather than trusting extensions or
  client-provided MIME headers. Generate server-controlled storage keys and
  prevent path traversal.
- Keep upload staging, verification, metadata changes, and cleanup safe under
  retries and concurrent replicas. Use durable ownership/claim state when work
  must be performed once.
- Never serve arbitrary filesystem paths. Only resolve validated storage keys
  beneath the configured image directory.
- HTTP and gRPC errors must not expose filesystem paths, SQL details, internal
  tokens, or raw user-controlled values.
- Background server and cleanup tasks must surface failures and participate in
  graceful shutdown rather than using unchecked `unwrap()` in task boundaries.

Tests should cover upload limits, malformed multipart data, content sniffing,
invalid keys, traversal attempts, authorization, retries, cleanup races, and
HTTP/gRPC failure mapping.
