package api

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestRetryableGRPCMethodOnlyRetriesReadsAndVerification(t *testing.T) {
	retryable := []string{
		"/thoughts.AuthService/GetSession",
		"/thoughts.PostService/GetFeed",
		"/thoughts.PostService/GetPost",
		"/thoughts.UserService/GetUser",
		"/thoughts.UserService/SearchUsers",
		"/thoughts.ImageService/VerifyUpload",
	}
	for _, method := range retryable {
		if !isRetryableGRPCMethod(method) {
			t.Fatalf("expected %s to be retryable", method)
		}
	}

	notRetryable := []string{
		"/thoughts.AuthService/DeleteSession",
		"/thoughts.PostService/CreatePost",
		"/thoughts.PostService/DeletePost",
		"/thoughts.PostService/LikePost",
		"/thoughts.UserService/UpdateUser",
		"/thoughts.UserService/FollowUser",
		"/thoughts.ImageService/ConsumeUpload",
		"/thoughts.ImageService/DeleteImage",
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
