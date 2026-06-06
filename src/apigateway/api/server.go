package api

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"log/slog"
	"net/http"
	"strconv"
	"time"
)

// CreateServer creates and setups new standard http.Handler
func CreateServer(authAddr, postAddr, userAddr, imageAddr string) http.Handler {
	setupLogger()
	mux := http.NewServeMux()
	router := newRouter(authAddr, postAddr, userAddr, imageAddr)
	router.configureRoutes(mux)

	var handler http.Handler = mux

	rlStore := NewPostgresRateLimiterStore()
	startRateLimitCleanup(rlStore)

	handler = rateLimitMiddleware(rlStore)(handler)
	handler = authGuard(router.auth)(handler)
	handler = newConcurrencyLimiter().middleware(handler)
	handler = csrfMiddleware()(handler)
	handler = bodyLimitMiddleware(2 * 1024 * 1024)(handler)
	handler = secureHeadersMiddleware()(handler)
	handler = loggerMiddleware()(handler)
	handler = requestIDMiddleware()(handler)

	return handler
}

func startRateLimitCleanup(store *PostgresRateLimiterStore) {
	interval := time.Duration(envInt("RATE_LIMIT_CLEANUP_INTERVAL_MINUTES", 60)) * time.Minute
	maxAge := time.Duration(envInt("RATE_LIMIT_MAX_AGE_HOURS", 24)) * time.Hour
	go func() {
		ticker := time.NewTicker(interval)
		defer ticker.Stop()
		for range ticker.C {
			if err := store.Cleanup(context.Background(), maxAge); err != nil {
				slog.Warn("rate limiter cleanup failed", "error", err)
			}
		}
	}()
}

func requestIDMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			requestID := r.Header.Get("X-Request-ID")
			if requestID == "" {
				requestID = newRequestID()
			}
			w.Header().Set("X-Request-ID", requestID)
			next.ServeHTTP(w, setRequestID(r, requestID))
		})
	}
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
			w.Header().Set("X-XSS-Protection", "1; mode=block")
			w.Header().Set("X-Content-Type-Options", "nosniff")
			w.Header().Set("X-Frame-Options", "SAMEORIGIN")
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

func csrfMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Generate a new CSRF token if one doesn't exist
			cookie, err := r.Cookie("_csrf")
			if err != nil || cookie.Value == "" {
				tokenBytes := make([]byte, 32)
				rand.Read(tokenBytes)
				token := base64.RawURLEncoding.EncodeToString(tokenBytes)
				http.SetCookie(w, &http.Cookie{
					Name:     "_csrf",
					Value:    token,
					Path:     "/",
					HttpOnly: false,
					SameSite: http.SameSiteStrictMode,
				})
			}

			// Skip CSRF for specific routes
			if (r.Method == "POST" && r.URL.Path == "/sessions") ||
				(r.Method == "POST" && r.URL.Path == "/users") ||
				(r.Method == "GET" && r.URL.Path == "/") {
				next.ServeHTTP(w, r)
				return
			}

			// Also skip GET requests in general for CSRF modifying state, or we check it?
			// The original echo CSRF skipper skipped only those three. Wait, standard CSRF applies to all?
			// Echo CSRF by default applies to POST, PUT, DELETE, PATCH
			if r.Method == "GET" || r.Method == "HEAD" || r.Method == "OPTIONS" || r.Method == "TRACE" {
				// but original skipper didn't explicitly say this. Echo CSRF middleware inherently skips safe methods.
			}

			if r.Method != "GET" && r.Method != "HEAD" && r.Method != "OPTIONS" && r.Method != "TRACE" {
				cookie, err := r.Cookie("_csrf")
				headerToken := r.Header.Get("X-CSRF-Token")
				if err != nil || cookie.Value == "" || headerToken == "" || cookie.Value != headerToken {
					http.Error(w, "Invalid CSRF token", http.StatusForbidden)
					return
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

func rateLimitMiddleware(store *PostgresRateLimiterStore) func(http.Handler) http.Handler {
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
					http.Error(w, "Service unavailable", http.StatusServiceUnavailable)
					return
				}
			}
			if !decision.Allowed {
				w.Header().Set("Retry-After", strconv.Itoa(int(decision.RetryAfter.Seconds()+0.5)))
				http.Error(w, "Too many requests", http.StatusTooManyRequests)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
