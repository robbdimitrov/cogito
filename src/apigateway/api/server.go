package api

import (
	"crypto/rand"
	"encoding/base64"
	"log"
	"net/http"
	"strings"
)

// CreateServer creates and setups new standard http.Handler
func CreateServer(authAddr, postAddr, userAddr, imageAddr string) http.Handler {
	mux := http.NewServeMux()
	router := newRouter(authAddr, postAddr, userAddr, imageAddr)
	router.configureRoutes(mux)

	var handler http.Handler = mux

	// Auth Guard Middleware
	handler = authGuard(router.auth)(handler)

	// Rate Limiter Middleware
	rlStore := NewPostgresRateLimiterStore(5, 0.5)
	handler = rateLimitMiddleware(rlStore)(handler)

	// CSRF Middleware
	handler = csrfMiddleware()(handler)

	// Body Limit Middleware (2M)
	handler = bodyLimitMiddleware(2 * 1024 * 1024)(handler)

	// Secure Headers Middleware
	handler = secureHeadersMiddleware()(handler)

	// Request Logger Middleware
	handler = loggerMiddleware()(handler)

	return handler
}

func loggerMiddleware() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			log.Printf("Request %s %s", r.Method, r.URL.RequestURI())
			next.ServeHTTP(w, r)
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
					http.Error(w, "Invalid CSRF token", 403)
					return
				}
			}

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

			next.ServeHTTP(w, r)
		})
	}
}

func rateLimitMiddleware(store *PostgresRateLimiterStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Skip for certain routes
			if r.Method == "POST" && (r.URL.Path == "/sessions" || r.URL.Path == "/users") {
				next.ServeHTTP(w, r)
				return
			}

			ip := r.RemoteAddr
			if forwarded := r.Header.Get("X-Forwarded-For"); forwarded != "" {
				ip = strings.Split(forwarded, ",")[0]
			}
			
			allowed, err := store.Allow(ip)
			if err != nil {
				http.Error(w, err.Error(), 500)
				return
			}
			if !allowed {
				http.Error(w, "Too many requests", 429)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
