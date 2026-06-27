# API Gateway Instructions

These rules extend the repository-level `AGENTS.md` for `apps/apigateway/`.

## Responsibilities

- `api/router.go` owns public route registration and image HTTP proxying.
- Controllers parse HTTP transport data, call gRPC clients, and map domain
  responses and failures back to the public JSON API.
- `api/auth_guard.go` defines the public-route allowlist. New unauthenticated
  routes require explicit justification.
- The gateway derives user identity from the validated `session` cookie and
  passes trusted identity to backends through established metadata. Never accept
  a request user ID as proof of identity.

## Runtime and Resilience

- Preserve middleware ordering for request IDs, recovery, body limits,
  rate-limiting, and authentication.
- Keep request body limits explicit. Upload proxying must remain bounded end to
  end rather than relying only on the image service.
- Use shared JSON response helpers for new errors. Existing `http.Error` call
  sites are compatibility debt and should not be copied into new paths.
- All gRPC and image HTTP calls require deadlines. Map upstream unavailable,
  timeout, validation, authentication, and authorization failures deliberately.
- Rate limits are shared in PostgreSQL so they work across replicas. Add an
  explicit policy for new abuse-prone public endpoints.
- Proxy only the intended image paths and headers. Do not forward arbitrary
  client-supplied internal authentication or identity headers.

Test with typed client fakes and `httptest`: verify status, JSON shape, headers,
cookies, authorization, body limits, and upstream failure mapping.
