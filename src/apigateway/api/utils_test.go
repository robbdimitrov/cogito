package api

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/labstack/echo/v4"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestGetStatusCode(t *testing.T) {
	tests := []struct {
		code     codes.Code
		expected int
	}{
		{codes.InvalidArgument, http.StatusBadRequest},
		{codes.Unauthenticated, http.StatusUnauthorized},
		{codes.PermissionDenied, http.StatusForbidden},
		{codes.NotFound, http.StatusNotFound},
		{codes.Internal, http.StatusInternalServerError},
	}

	for _, tt := range tests {
		s := status.New(tt.code, "test")
		if got := getStatusCode(s); got != tt.expected {
			t.Errorf("expected %v, got %v", tt.expected, got)
		}
	}
}

func TestNewHTTPError(t *testing.T) {
	s := status.New(codes.NotFound, "not found")
	err := newHTTPError(s.Err())
	if err.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %v", err.Code)
	}
	if err.Message != "not found" {
		t.Errorf("expected 'not found', got %v", err.Message)
	}
}

func TestInsecureCredentials(t *testing.T) {
	opt := insecureCredentials()
	if opt == nil {
		t.Errorf("expected grpc.DialOption, got nil")
	}
}

func TestGetIntQuery(t *testing.T) {
	e := echo.New()
	req := httptest.NewRequest(http.MethodGet, "/?valid=10&invalid=abc", nil)
	rec := httptest.NewRecorder()
	c := e.NewContext(req, rec)

	if val, err := getIntQuery(c, "empty", 5); err != nil || val != 5 {
		t.Errorf("expected 5, got %v with error %v", val, err)
	}
	if val, err := getIntQuery(c, "valid", 5); err != nil || val != 10 {
		t.Errorf("expected 10, got %v with error %v", val, err)
	}
	if _, err := getIntQuery(c, "invalid", 5); err == nil {
		t.Errorf("expected error, got nil")
	}
}

func TestGetPageAndLimit(t *testing.T) {
	e := echo.New()
	tests := []struct {
		query       string
		page        int
		limit       int
		expectError bool
	}{
		{"/", 0, 20, false},
		{"/?page=2&limit=50", 2, 50, false},
		{"/?page=-1", 0, 0, true},
		{"/?limit=0", 0, 0, true},
		{"/?limit=101", 0, 0, true},
		{"/?page=abc", 0, 0, true},
		{"/?limit=abc", 0, 0, true},
	}

	for _, tt := range tests {
		req := httptest.NewRequest(http.MethodGet, tt.query, nil)
		c := e.NewContext(req, httptest.NewRecorder())
		page, limit, err := getPageAndLimit(c)
		if tt.expectError {
			if err == nil {
				t.Errorf("expected error for query %s, got nil", tt.query)
			}
		} else {
			if err != nil {
				t.Errorf("unexpected error for query %s: %v", tt.query, err)
			}
			if page != tt.page || limit != tt.limit {
				t.Errorf("for query %s expected %d, %d got %d, %d", tt.query, tt.page, tt.limit, page, limit)
			}
		}
	}
}
