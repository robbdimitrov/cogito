package api

import (
	"context"
	"log/slog"
	"net/http"
	"strconv"
	"time"
)

// maxRequestBodyBytes is the gateway-wide hard body-size ceiling. Uploads also
// pre-buffer unknown-length bodies to return JSON 413 before reverse proxying.
const maxRequestBodyBytes = 2 * 1024 * 1024

// CreateServer builds the gateway HTTP handler and middleware chain.
func CreateServer(ctx context.Context, authAddr, postAddr, userAddr, imageAddr, searchAddr, eventsAddr string) http.Handler {
	setupLogger()
	mux := http.NewServeMux()
	router := newRouter(authAddr, postAddr, userAddr, imageAddr, searchAddr, eventsAddr)
	router.configureRoutes(mux)

	var handler http.Handler = mux

	rlStore := NewCacheStore(ctx)

	// authGuard must run before rateLimitMiddleware so browser traffic keys by
	// user ID instead of the shared SvelteKit proxy address.
	handler = newConcurrencyLimiter().middleware(handler)
	handler = rateLimitMiddleware(rlStore)(handler)
	handler = authGuard(router.auth)(handler)
	handler = bodyLimitMiddleware(maxRequestBodyBytes)(handler)
	handler = secureHeadersMiddleware()(handler)
	handler = recoveryMiddleware()(handler)
	handler = loggerMiddleware()(handler)
	handler = requestIDMiddleware()(handler)

	return handler
}

func requestIDMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestID := r.Header.Get("X-Request-ID")
			if !isValidRequestID(requestID) {
				requestID = newRequestID()
			}
			w.Header().Set("X-Request-ID", requestID)
			next.ServeHTTP(w, setRequestID(r, requestID))
		})
	}
}

func isValidRequestID(id string) bool {
	if id == "" || len(id) > 64 {
		return false
	}
	for i := 0; i < len(id); i++ {
		b := id[i]
		if b < 0x20 || b > 0x7e {
			return false
		}
	}
	return true
}

func loggerMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rec := &statusRecorder{ResponseWriter: w}
			next.ServeHTTP(rec, r)
			if rec.status == 0 {
				rec.status = http.StatusOK
			}
			slog.Info("http request",
				"request_id", getRequestID(r),
				"method", r.Method,
				"route", r.Pattern,
				"path", r.URL.Path,
				"status", rec.status,
				"duration_ms", time.Since(start).Milliseconds(),
			)
		})
	}
}

// recoveryMiddleware sits inside loggerMiddleware so the recovered response's
// status still reaches the access log, and outside routes/backends so it
// catches panics from any handler or inner middleware.
func recoveryMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			defer func() {
				if rec := recover(); rec != nil {
					slog.Error("panic recovered", "request_id", getRequestID(r), "route", r.Pattern, "panic", rec)
					jsonError(w, http.StatusInternalServerError, "Internal server error")
				}
			}()
			next.ServeHTTP(w, r)
		})
	}
}

// secureHeadersMiddleware applies to every response. The gateway only ever
// emits JSON, so the CSP stays fully locked down rather than carrying a
// browser-app baseline this origin doesn't need. No Strict-Transport-Security:
// this deployment has no TLS termination (local k3s only), and sending it
// over plain HTTP would be a false guarantee to clients.
func secureHeadersMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// 0 disables the legacy XSS auditor; it has its own injection vectors
			// and is superseded by the Content-Security-Policy below.
			w.Header().Set("X-XSS-Protection", "0")
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "DENY")
			w.Header().Set("Referrer-Policy", "no-referrer")
			w.Header().Set("Content-Security-Policy", "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'")
			next.ServeHTTP(w, r)
		})
	}
}

func bodyLimitMiddleware(limit int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, limit)
			next.ServeHTTP(w, r)
		})
	}
}

func rateLimitMiddleware(store RateLimiterStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			policy, exempt := rateLimitPolicy(r)
			if exempt {
				next.ServeHTTP(w, r)
				return
			}

			decision, err := store.Allow(r.Context(), rateLimitKey(r, policy), policy)
			if err != nil {
				slog.Error("rate limiter storage failed", "request_id", getRequestID(r), "policy", policy.Name, "error", err)
				if !decision.Allowed {
					jsonError(w, http.StatusServiceUnavailable, "Service unavailable")
					return
				}
			}
			if !decision.Allowed {
				w.Header().Set("Retry-After", strconv.Itoa(int(decision.RetryAfter.Seconds()+0.5)))
				jsonError(w, http.StatusTooManyRequests, "Too many requests")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
