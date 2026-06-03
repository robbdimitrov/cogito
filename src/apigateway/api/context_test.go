package api

import (
	"context"
	"net/http"
	"net/http/httptest"
	"os"
	"testing"
)

func TestUserContext(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	if uid := getUserID(req); uid != "" {
		t.Errorf("expected empty user id, got %s", uid)
	}

	req = setUserID(req, "123")
	if uid := getUserID(req); uid != "123" {
		t.Errorf("expected 123, got %s", uid)
	}
}

func TestAppendUserIDHeader(t *testing.T) {
	req := httptest.NewRequest(http.MethodGet, "/", nil)

	ctx, err := appendUserIDHeader(context.Background(), req)
	if err == nil {
		t.Errorf("expected error when user id is missing")
	}

	req = setUserID(req, "456")
	ctx, err = appendUserIDHeader(context.Background(), req)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if ctx == nil {
		t.Errorf("expected context, got nil")
	}
}

func TestCookies(t *testing.T) {
	rec := httptest.NewRecorder()

	os.Setenv("COOKIE_SECURE", "true")
	defer os.Unsetenv("COOKIE_SECURE")

	createCookie(rec, "session-123")
	
	var found bool
	for _, cookie := range rec.Result().Cookies() {
		if cookie.Name == "session" {
			found = true
			if cookie.Value != "session-123" {
				t.Errorf("expected session-123, got %s", cookie.Value)
			}
			if !cookie.Secure {
				t.Errorf("expected cookie to be secure")
			}
		}
	}
	if !found {
		t.Errorf("cookie not found")
	}

	rec2 := httptest.NewRecorder()
	clearCookie(rec2)
	for _, cookie := range rec2.Result().Cookies() {
		if cookie.Name == "session" {
			if cookie.Value != "" {
				t.Errorf("expected empty value for cleared cookie")
			}
		}
	}
}
