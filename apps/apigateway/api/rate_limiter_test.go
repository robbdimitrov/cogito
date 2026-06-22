package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestClientIP(t *testing.T) {
	tests := []struct {
		name       string
		remoteAddr string
		forwarded  string
		want       string
	}{
		{
			name:       "host extracted from remote addr",
			remoteAddr: "203.0.113.5:443",
			want:       "203.0.113.5",
		},
		{
			name:       "spoofed X-Forwarded-For is ignored",
			remoteAddr: "203.0.113.5:443",
			forwarded:  "1.2.3.4",
			want:       "203.0.113.5",
		},
		{
			name:       "remote addr without port returned as-is",
			remoteAddr: "203.0.113.5",
			want:       "203.0.113.5",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/", nil)
			req.RemoteAddr = tt.remoteAddr
			if tt.forwarded != "" {
				req.Header.Set("X-Forwarded-For", tt.forwarded)
			}
			if got := clientIP(req); got != tt.want {
				t.Errorf("clientIP() = %q, want %q", got, tt.want)
			}
		})
	}
}

func TestRateLimitPolicy(t *testing.T) {
	tests := []struct {
		method string
		path   string
		want   string
		exempt bool
	}{
		{http.MethodGet, "/", "", true},
		{http.MethodPost, "/sessions", "strict", false},
		{http.MethodPost, "/users", "strict", false},
		{http.MethodPost, "/uploads", "strict", false},
		{http.MethodGet, "/users/search", "typeahead", false},
		{http.MethodGet, "/hashtags/search", "typeahead", false},
		{http.MethodGet, "/posts", "read", false},
		{http.MethodHead, "/posts", "read", false},
		{http.MethodDelete, "/posts/1", "mutation", false},
	}
	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			policy, exempt := rateLimitPolicy(req)
			if exempt != tt.exempt {
				t.Errorf("exempt = %v, want %v", exempt, tt.exempt)
			}
			if !tt.exempt && policy.Name != tt.want {
				t.Errorf("policy.Name = %q, want %q", policy.Name, tt.want)
			}
		})
	}
}

func TestRateLimitKey(t *testing.T) {
	tests := []struct {
		name       string
		policy     RateLimitPolicy
		userID     string
		sessionVal string
		remoteAddr string
		wantPrefix string
	}{
		{
			name:       "authenticated user keyed by user ID",
			policy:     RateLimitPolicy{Name: "read"},
			userID:     "42",
			remoteAddr: "10.0.0.1:1234",
			wantPrefix: "read:user:42",
		},
		{
			name:       "session cookie used when no user ID",
			policy:     RateLimitPolicy{Name: "read"},
			sessionVal: "abc123",
			remoteAddr: "10.0.0.1:1234",
			wantPrefix: "read:session:abc123",
		},
		{
			name:       "falls back to IP when no user or session",
			policy:     RateLimitPolicy{Name: "read"},
			remoteAddr: "10.0.0.1:1234",
			wantPrefix: "read:ip:10.0.0.1",
		},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodGet, "/posts", nil)
			req.RemoteAddr = tt.remoteAddr
			if tt.userID != "" {
				req = setUserID(req, tt.userID)
			}
			if tt.sessionVal != "" {
				req.AddCookie(&http.Cookie{Name: "session", Value: tt.sessionVal})
			}
			got := rateLimitKey(req, tt.policy)
			if got != tt.wantPrefix {
				t.Errorf("rateLimitKey() = %q, want %q", got, tt.wantPrefix)
			}
		})
	}
}
