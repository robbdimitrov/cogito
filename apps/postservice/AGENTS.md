# Post Service Instructions

These rules extend the repository-level `AGENTS.md` for `apps/postservice/`.

- `post/controller.go` owns gRPC transport behavior and authenticated workflow
  coordination. `post/db_client.go` owns PostgreSQL operations.
- Enforce post ownership in the mutation query or transaction. Deletion must
  constrain both post ID and user ID.
- Preserve atomic counters and relationship changes for likes, reposts, replies,
  and deletes. Avoid check-then-act sequences outside a transaction.
- Keep feed and list queries bounded and deterministic. Pagination changes
  require tests for ordering, empty results, and page boundaries.
- Map absence, conflicts, and invalid relationships to deliberate gRPC statuses
  rather than raw database errors.
- Test mapping and workflow behavior with typed fakes; add database-backed
  coverage when correctness depends on SQL constraints or transaction behavior.
