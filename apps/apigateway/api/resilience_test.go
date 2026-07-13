package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRetryableGRPCMethodOnlyRetriesReadsAndVerification(t *testing.T) {
	retryable := []string{
		"/cogito.AuthService/GetSession",
		"/cogito.PostService/GetFeed",
		"/cogito.PostService/GetPost",
		"/cogito.UserService/GetUser",
		"/cogito.ImageService/VerifyUpload",
	}
	for _, method := range retryable {
		if !isRetryableGRPCMethod(method) {
			t.Fatalf("expected %s to be retryable", method)
		}
	}

	notRetryable := []string{
		"/cogito.AuthService/DeleteSession",
		"/cogito.PostService/CreatePost",
		"/cogito.PostService/DeletePost",
		"/cogito.PostService/LikePost",
		"/cogito.UserService/UpdateUser",
		"/cogito.UserService/FollowUser",
		"/cogito.ImageService/ConsumeUpload",
		"/cogito.ImageService/DeleteImage",
	}
	for _, method := range notRetryable {
		if isRetryableGRPCMethod(method) {
			t.Fatalf("expected %s not to be retryable", method)
		}
	}
}

func TestStatusRecorderUnwrapsResponseWriter(t *testing.T) {
	base := httptest.NewRecorder()
	rec := &statusRecorder{ResponseWriter: base}

	if rec.Unwrap() != base {
		t.Fatalf("expected recorder to unwrap original response writer")
	}

	rec.WriteHeader(http.StatusCreated)
	if rec.status != http.StatusCreated {
		t.Fatalf("expected status %d, got %d", http.StatusCreated, rec.status)
	}
}

func TestImageHTTPTransportHasBoundedConnectionPolicy(t *testing.T) {
	transport := newImageHTTPTransport()

	if transport.MaxIdleConns != imageHTTPMaxIdleConns {
		t.Fatalf("expected max idle conns %d, got %d", imageHTTPMaxIdleConns, transport.MaxIdleConns)
	}
	if transport.MaxIdleConnsPerHost != imageHTTPMaxIdleConnsPerHost {
		t.Fatalf("expected max idle conns per host %d, got %d", imageHTTPMaxIdleConnsPerHost, transport.MaxIdleConnsPerHost)
	}
	if transport.MaxConnsPerHost != imageHTTPMaxConnsPerHost {
		t.Fatalf("expected max conns per host %d, got %d", imageHTTPMaxConnsPerHost, transport.MaxConnsPerHost)
	}
	if transport.IdleConnTimeout <= 0 || transport.IdleConnTimeout > 2*time.Minute {
		t.Fatalf("expected bounded idle timeout, got %s", transport.IdleConnTimeout)
	}
	if transport.ResponseHeaderTimeout <= 0 {
		t.Fatalf("expected response header timeout, got %s", transport.ResponseHeaderTimeout)
	}
}
