package api

import (
	"context"
	"crypto/rand"
	"crypto/subtle"
	"encoding/base64"
	"log/slog"
	"net/http"
	"strconv"
	"time"
)

// CreateServer builds the gateway HTTP handler and middleware chain.
func CreateServer(authAddr, postAddr, userAddr, imageAddr string) http.Handler {
	setupLogger()
	mux := http.NewServeMux()
	router := newRouter(authAddr, postAddr, userAddr, imageAddr)
	router.configureRoutes(mux)

	var handler http.Handler = mux

	rlStore := NewPostgresRateLimiterStore()
	startRateLimitCleanup(rlStore)

	// authGuard runs before rateLimitMiddleware so the user ID is in context
	// when the rate limit key is computed. Per-user keying is critical: without
	// it, every request falls back to the IP key and all users share one bucket
	// (all browser traffic arrives via the Next.js proxy pod, so RemoteAddr is
	// always the same host).
	handler = newConcurrencyLimiter().middleware(handler)
	handler = rateLimitMiddleware(rlStore)(handler)
	handler = authGuard(router.auth)(handler)
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

func csrfMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			cookie, err := r.Cookie("_csrf")
			if err != nil || cookie.Value == "" {
				tokenBytes := make([]byte, 32)
				if _, err := rand.Read(tokenBytes); err != nil {
					http.Error(w, "Failed to generate CSRF token", http.StatusInternalServerError)
					return
				}
				token := base64.RawURLEncoding.EncodeToString(tokenBytes)
				http.SetCookie(w, &http.Cookie{
					Name:     "_csrf",
					Value:    token,
					Path:     "/",
					HttpOnly: false,
					Secure:   secureCookies(),
					SameSite: http.SameSiteStrictMode,
				})
			}

			// Safe methods (including the GET / health check) skip the
			// double-submit check below. Login and signup are intentionally
			// not exempt: the _csrf cookie is issued on page load, so clients
			// must echo it via X-CSRF-Token to prevent login CSRF.
			if r.Method != "GET" && r.Method != "HEAD" && r.Method != "OPTIONS" && r.Method != "TRACE" {
				headerToken := r.Header.Get("X-CSRF-Token")
				if err != nil || cookie.Value == "" || headerToken == "" || subtle.ConstantTimeCompare([]byte(cookie.Value), []byte(headerToken)) != 1 {
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
