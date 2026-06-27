# Auth Service Instructions

These rules extend the repository-level `AGENTS.md` for `apps/authservice/`.

- Session IDs are high-entropy server-issued credentials. Persist only their
  keyed hash and compare credential-derived values in constant time.
- `SESSION_HMAC_SECRET` is required secure configuration. Do not add fallback
  production secrets or log secret/session material.
- Keep login failures indistinguishable where account existence is sensitive.
- Session expiry must be enforced on reads as well as periodic cleanup. Cleanup
  spanning replicas must be harmless when run concurrently.
- The service accepts only calls authenticated by the internal interceptor. The
  gateway owns end-user authorization for session listing and deletion; preserve
  that boundary and do not make these RPCs publicly reachable.
- Treat user IDs supplied by the trusted gateway as internal authorization
  context, not as proof that would be safe from an arbitrary caller.
- Tests should cover credential failure, expiry, hashing, deletion, database
  failure mapping, and cleanup behavior.
