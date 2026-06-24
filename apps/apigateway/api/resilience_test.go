package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRetryableGRPCMethodOnlyRetriesReadsAndVerification(t *testing.T) {
	retryable := []string{
		"/cogito.AuthService/GetSession",
		"/cogito.PostService/GetFeed",
		"/cogito.PostService/GetPost",
		"/cogito.UserService/GetUser",
		"/cogito.UserService/SearchUsers",
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
