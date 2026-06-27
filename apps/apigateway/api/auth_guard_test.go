package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
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
