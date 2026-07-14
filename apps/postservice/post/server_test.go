package post

import (
	"context"
	"testing"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

func TestRecoveryInterceptorConvertsPanicToInternalStatus(t *testing.T) {
	panicking := func(ctx context.Context, req interface{}) (interface{}, error) {
		panic("boom")
	}

	resp, err := recoveryInterceptor(context.Background(), nil, &grpc.UnaryServerInfo{FullMethod: "/cogito.PostService/CreatePost"}, panicking)

	if resp != nil {
		t.Fatalf("expected nil response, got %v", resp)
	}
	if status.Code(err) != codes.Internal {
		t.Fatalf("expected codes.Internal, got %v", status.Code(err))
	}
}

func TestRecoveryInterceptorPassesThroughNormalResponses(t *testing.T) {
	handler := func(ctx context.Context, req interface{}) (interface{}, error) {
		return "ok", nil
	}

	resp, err := recoveryInterceptor(context.Background(), nil, &grpc.UnaryServerInfo{FullMethod: "/cogito.PostService/CreatePost"}, handler)

	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if resp != "ok" {
		t.Fatalf("expected response %q, got %v", "ok", resp)
	}
}
