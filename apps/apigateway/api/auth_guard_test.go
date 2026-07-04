package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestAuthGuard_AllowsPublicUploadReadsWithoutSession(t *testing.T) {
	for _, method := range []string{http.MethodGet, http.MethodHead} {
		t.Run(method, func(t *testing.T) {
			called := false
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				called = true
				w.WriteHeader(http.StatusNoContent)
			})

			req := httptest.NewRequest(method, "/uploads/profile.jpg", nil)
			w := httptest.NewRecorder()

			authGuard(nil)(next).ServeHTTP(w, req)

			if !called {
				t.Fatal("expected public upload read to reach next handler")
			}
			if w.Code != http.StatusNoContent {
				t.Fatalf("expected status 204, got %d", w.Code)
			}
		})
	}
}

func TestAuthGuard_DoesNotBypassNestedUploadPath(t *testing.T) {
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Fatal("nested upload path should not bypass auth")
	})

	req := httptest.NewRequest(http.MethodGet, "/uploads/nested/profile.jpg", nil)
	w := httptest.NewRecorder()

	authGuard(&authController{})(next).ServeHTTP(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected status 401, got %d", w.Code)
	}
}

func TestAuthGuard_AllowsPublicPostAndUserReadsWithoutSession(t *testing.T) {
	paths := []string{"/posts/123", "/users/123", "/users/123/posts", "/users?username=alice"}
	for _, path := range paths {
		t.Run(path, func(t *testing.T) {
			called := false
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				called = true
				w.WriteHeader(http.StatusNoContent)
			})

			req := httptest.NewRequest(http.MethodGet, path, nil)
			w := httptest.NewRecorder()

			authGuard(nil)(next).ServeHTTP(w, req)

			if !called {
				t.Fatalf("expected %s to reach next handler", path)
			}
			if w.Code != http.StatusNoContent {
				t.Fatalf("expected status 204, got %d", w.Code)
			}
		})
	}
}

func TestAuthGuard_PublicPostReadStillResolvesValidSession(t *testing.T) {
	ac := &authController{client: &mockAuthServiceClient{sessionUserID: 42}}

	var gotUserID string
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUserID = getUserID(r)
		w.WriteHeader(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/posts/123", nil)
	req.AddCookie(&http.Cookie{Name: "session", Value: "valid-session"})
	w := httptest.NewRecorder()

	authGuard(ac)(next).ServeHTTP(w, req)

	if gotUserID != "42" {
		t.Fatalf("expected a valid session on a public read to resolve the user id, got %q", gotUserID)
	}
}

func TestAuthGuard_PublicUserByUsernameReadStillResolvesValidSession(t *testing.T) {
	// Regression test: GET /users (getUserByUsername) was previously in the
	// unconditional `allowed` allowlist, which bypasses validateSessionOptional
	// entirely — a logged-in caller looking up any profile by username, the
	// primary way profiles are loaded, always looked anonymous.
	ac := &authController{client: &mockAuthServiceClient{sessionUserID: 42}}

	var gotUserID string
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotUserID = getUserID(r)
		w.WriteHeader(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/users?username=alice", nil)
	req.AddCookie(&http.Cookie{Name: "session", Value: "valid-session"})
	w := httptest.NewRecorder()

	authGuard(ac)(next).ServeHTTP(w, req)

	if gotUserID != "42" {
		t.Fatalf("expected a valid session on GET /users to resolve the user id, got %q", gotUserID)
	}
}

func TestAuthGuard_PublicPostReadToleratesInvalidSession(t *testing.T) {
	ac := &authController{client: &mockAuthServiceClient{errGetSession: status.Error(codes.Unauthenticated, "expired")}}

	called := false
	var gotUserID string
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		gotUserID = getUserID(r)
		w.WriteHeader(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/posts/123", nil)
	req.AddCookie(&http.Cookie{Name: "session", Value: "stale-session"})
	w := httptest.NewRecorder()

	authGuard(ac)(next).ServeHTTP(w, req)

	if !called {
		t.Fatal("expected a public read with an invalid session to still reach next handler anonymously")
	}
	if gotUserID != "" {
		t.Fatalf("expected an invalid session to fall back to anonymous, got user id %q", gotUserID)
	}
	if w.Code != http.StatusNoContent {
		t.Fatalf("expected status 204, got %d", w.Code)
	}
}

func TestAuthGuard_PublicPostReadSurfacesTransientAuthFailure(t *testing.T) {
	// Regression test: a valid session must not be silently downgraded to
	// anonymous when authservice itself is unavailable — only a missing or
	// confirmed-invalid cookie should fall back to anonymous.
	ac := &authController{client: &mockAuthServiceClient{errGetSession: status.Error(codes.Unavailable, "authservice down")}}

	called := false
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		w.WriteHeader(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/posts/123", nil)
	req.AddCookie(&http.Cookie{Name: "session", Value: "valid-session"})
	w := httptest.NewRecorder()

	authGuard(ac)(next).ServeHTTP(w, req)

	if called {
		t.Fatal("expected a transient auth failure to not silently proceed as anonymous")
	}
	if w.Code != http.StatusServiceUnavailable {
		t.Fatalf("expected status 503, got %d", w.Code)
	}
}

func TestAuthGuard_DoesNotBypassGatedPostAndUserRoutes(t *testing.T) {
	// Includes the two collision-regression cases: GET /posts/feed and
	// GET /users/search have the same single-segment shape as the public
	// /posts/{postId} and /users/{userId} routes, but must stay gated.
	paths := []string{
		"/posts/123/likes",
		"/posts/123/replies",
		"/posts/feed",
		"/users/123/likes",
		"/users/123/following",
		"/users/123/followers",
		"/users/search",
	}
	for _, path := range paths {
		t.Run(path, func(t *testing.T) {
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
				t.Fatalf("%s should not bypass auth", path)
			})

			req := httptest.NewRequest(http.MethodGet, path, nil)
			w := httptest.NewRecorder()

			authGuard(&authController{})(next).ServeHTTP(w, req)

			if w.Code != http.StatusUnauthorized {
				t.Fatalf("expected status 401 for %s, got %d", path, w.Code)
			}
		})
	}
}
