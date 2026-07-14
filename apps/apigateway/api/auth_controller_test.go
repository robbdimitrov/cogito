package api

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	pb "cogito/apigateway/genproto"
)

func TestGetSessionsPinsCurrentSessionFirst(t *testing.T) {
	mockAuth := &mockAuthServiceClient{
		sessions: []*pb.Session{
			{Id: "s1", Handle: "s1", UserId: 1, Created: "2026-07-10T00:00:00Z"},
			{Id: "s2", Handle: "current-session", UserId: 1, Created: "2026-07-01T00:00:00Z"},
			{Id: "s3", Handle: "s3", UserId: 1, Created: "2026-07-05T00:00:00Z"},
		},
	}
	ac := &authController{client: mockAuth}

	req := httptest.NewRequest(http.MethodGet, "/auth/sessions", nil)
	req.AddCookie(&http.Cookie{Name: "session", Value: "whatever"})
	rec := httptest.NewRecorder()

	ac.getSessions(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var body struct {
		Sessions         []session `json:"sessions"`
		CurrentSessionID string    `json:"currentSessionId"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if body.CurrentSessionID != "current-session" {
		t.Fatalf("expected currentSessionId %q, got %q", "current-session", body.CurrentSessionID)
	}
	if len(body.Sessions) != 3 {
		t.Fatalf("expected 3 sessions, got %d", len(body.Sessions))
	}
	if body.Sessions[0].ID != "current-session" {
		t.Fatalf("expected current session first, got order %v", body.Sessions)
	}
	// Non-current sessions keep their relative (created DESC) order.
	if body.Sessions[1].ID != "s1" || body.Sessions[2].ID != "s3" {
		t.Fatalf("expected stable relative order for non-current sessions, got %v", body.Sessions)
	}
}
