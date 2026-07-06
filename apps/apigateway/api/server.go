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

func secureHeadersMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Strict-Transport-Security", "max-age=31536000; includeSubDomains")
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "SAMEORIGIN")
			w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
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
