package api

import (
	"bytes"
	"context"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"

	pb "cogito/apigateway/genproto"
)

type fakeThrottle struct {
	failures     []LoginFailure
	recordedKeys []string
	clearedKeys  []string
	err          error
}

func (f *fakeThrottle) GetFailures(_ context.Context, _ []string) ([]LoginFailure, error) {
	return f.failures, f.err
}

func (f *fakeThrottle) RecordFailure(_ context.Context, key string) (int, error) {
	f.recordedKeys = append(f.recordedKeys, key)
	return 0, nil
}

func (f *fakeThrottle) Clear(_ context.Context, keys []string) error {
	f.clearedKeys = append(f.clearedKeys, keys...)
	return nil
}

type mockCreateSessionClient struct {
	pb.AuthServiceClient
	res    *pb.Session
	err    error
	called bool
}

func (m *mockCreateSessionClient) CreateSession(_ context.Context, _ *pb.Credentials, _ ...grpc.CallOption) (*pb.Session, error) {
	m.called = true
	return m.res, m.err
}

func newTestAuthController(throttle LoginThrottle, client pb.AuthServiceClient) *authController {
	return &authController{
		client:         client,
		throttle:       throttle,
		ipThreshold:    5,
		emailThreshold: 50,
	}
}

func loginRequest(email, password string) *http.Request {
	body := `{"email":"` + email + `","password":"` + password + `"}`
	req := httptest.NewRequest("POST", "/sessions", bytes.NewBufferString(body))
	req.RemoteAddr = "192.0.2.1:1234"
	return req
}

func TestCreateSessionRateLimitedByIP(t *testing.T) {
	throttle := &fakeThrottle{
		failures: []LoginFailure{
			{Key: "ip:192.0.2.1", Count: 5},
		},
	}
	client := &mockCreateSessionClient{res: &pb.Session{Id: "s1", UserId: 1}}

	ac := newTestAuthController(throttle, client)
	w := httptest.NewRecorder()
	ac.createSession(w, loginRequest("user@example.com", "pass"))

	if w.Code != http.StatusTooManyRequests {
		t.Errorf("expected 429, got %d", w.Code)
	}
	if client.called {
		t.Error("expected gRPC not called when rate limited")
	}
}

func TestCreateSessionRateLimitedByEmail(t *testing.T) {
	throttle := &fakeThrottle{
		failures: []LoginFailure{
			{Key: "email:user@example.com", Count: 50},
		},
	}
	client := &mockCreateSessionClient{res: &pb.Session{Id: "s1", UserId: 1}}

	ac := newTestAuthController(throttle, client)
	w := httptest.NewRecorder()
	ac.createSession(w, loginRequest("user@example.com", "pass"))

	if w.Code != http.StatusTooManyRequests {
		t.Errorf("expected 429, got %d", w.Code)
	}
	if client.called {
		t.Error("expected gRPC not called when rate limited")
	}
}

func TestCreateSessionEmailKeyRequiresHigherThreshold(t *testing.T) {
	throttle := &fakeThrottle{
		failures: []LoginFailure{
			{Key: "email:user@example.com", Count: 5},
		},
	}
	client := &mockCreateSessionClient{res: &pb.Session{Id: "s1", UserId: 1}}

	ac := newTestAuthController(throttle, client)
	w := httptest.NewRecorder()
	ac.createSession(w, loginRequest("user@example.com", "pass"))

	if !client.called {
		t.Error("expected gRPC called when below email threshold")
	}
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestCreateSessionFailedLoginRecordsBothKeys(t *testing.T) {
	throttle := &fakeThrottle{}
	client := &mockCreateSessionClient{
		err: status.Error(codes.Unauthenticated, "invalid credentials"),
	}

	ac := newTestAuthController(throttle, client)
	w := httptest.NewRecorder()
	ac.createSession(w, loginRequest("user@example.com", "pass"))

	if len(throttle.recordedKeys) != 2 {
		t.Fatalf("expected 2 recorded keys, got %d", len(throttle.recordedKeys))
	}
	if throttle.recordedKeys[0] != "ip:192.0.2.1" {
		t.Errorf("expected recorded key %q, got %q", "ip:192.0.2.1", throttle.recordedKeys[0])
	}
	if throttle.recordedKeys[1] != "email:user@example.com" {
		t.Errorf("expected recorded key %q, got %q", "email:user@example.com", throttle.recordedKeys[1])
	}
}

func TestCreateSessionSuccessClearsBothKeys(t *testing.T) {
	throttle := &fakeThrottle{}
	client := &mockCreateSessionClient{res: &pb.Session{Id: "s1", UserId: 1}}

	ac := newTestAuthController(throttle, client)
	w := httptest.NewRecorder()
	ac.createSession(w, loginRequest("user@example.com", "pass"))

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if len(throttle.clearedKeys) != 2 {
		t.Fatalf("expected 2 cleared keys, got %d", len(throttle.clearedKeys))
	}
	if throttle.clearedKeys[0] != "ip:192.0.2.1" {
		t.Errorf("expected cleared key %q, got %q", "ip:192.0.2.1", throttle.clearedKeys[0])
	}
	if throttle.clearedKeys[1] != "email:user@example.com" {
		t.Errorf("expected cleared key %q, got %q", "email:user@example.com", throttle.clearedKeys[1])
	}
}

func TestCreateSessionThrottleErrorFailsOpen(t *testing.T) {
	throttle := &fakeThrottle{err: errors.New("cache unavailable")}
	client := &mockCreateSessionClient{res: &pb.Session{Id: "s1", UserId: 1}}

	ac := newTestAuthController(throttle, client)
	w := httptest.NewRecorder()
	ac.createSession(w, loginRequest("user@example.com", "pass"))

	if !client.called {
		t.Error("expected gRPC called when throttle errors (fail open)")
	}
	if w.Code == http.StatusTooManyRequests {
		t.Error("expected no 429 when throttle errors")
	}
}

func TestCreateSessionRateLimitedDoesNotRecordFailure(t *testing.T) {
	throttle := &fakeThrottle{
		failures: []LoginFailure{
			{Key: "ip:192.0.2.1", Count: 5},
		},
	}
	client := &mockCreateSessionClient{}

	ac := newTestAuthController(throttle, client)
	w := httptest.NewRecorder()
	ac.createSession(w, loginRequest("user@example.com", "pass"))

	if w.Code != http.StatusTooManyRequests {
		t.Errorf("expected 429, got %d", w.Code)
	}
	if len(throttle.recordedKeys) != 0 {
		t.Errorf("expected no recorded keys when already rate limited, got %d", len(throttle.recordedKeys))
	}
}
