# User Service Instructions

These rules extend the repository-level `AGENTS.md` for `apps/userservice/`.

- `controller.rs` owns gRPC transport behavior and workflows; `db_client.rs`
  owns PostgreSQL access; `crypto.rs` owns password hashing and verification.
- Hash passwords with the established password-hashing primitive and verify them
  in constant time. Never log passwords, password hashes, or reset-like
  credentials.
- Normalize and validate usernames, email addresses, names, bios, and image keys
  before persistence. Preserve uniqueness guarantees in PostgreSQL.
- Follow and unfollow operations must be atomic, reject invalid self-relations
  where required, and remain correct under concurrent duplicate requests.
- Profile and credential updates derive the acting user from trusted metadata,
  not from a client-selected user ID.
- Add service-level tests for authorization, uniqueness conflicts, password
  changes, follow state, and database failure mapping.
