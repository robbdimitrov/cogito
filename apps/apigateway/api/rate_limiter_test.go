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
