package post

import (
	"context"
	"testing"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
)

func TestNewError(t *testing.T) {
	err := newError(codes.NotFound)
	if err == nil {
		t.Errorf("expected error, got nil")
	}
}

func TestGetUserID(t *testing.T) {
	ctx := context.Background()
	if _, err := getUserID(ctx); err == nil {
		t.Errorf("expected error for missing metadata")
	}

	md := metadata.Pairs("other", "value")
	ctx = metadata.NewIncomingContext(context.Background(), md)
	if _, err := getUserID(ctx); err == nil {
		t.Errorf("expected error for missing user-id")
	}

	md = metadata.Pairs("user-id", "invalid")
	ctx = metadata.NewIncomingContext(context.Background(), md)
	if _, err := getUserID(ctx); err == nil {
		t.Errorf("expected error for invalid user-id")
	}

	md = metadata.Pairs("user-id", "123")
	ctx = metadata.NewIncomingContext(context.Background(), md)
	id, err := getUserID(ctx)
	if err != nil {
		t.Errorf("unexpected error: %v", err)
	}
	if id != 123 {
		t.Errorf("expected 123, got %d", id)
	}
}

func TestOptionalUserID(t *testing.T) {
	if id := optionalUserID(context.Background()); id != 0 {
		t.Errorf("expected 0 for missing metadata, got %d", id)
	}

	md := metadata.Pairs("other", "value")
	ctx := metadata.NewIncomingContext(context.Background(), md)
	if id := optionalUserID(ctx); id != 0 {
		t.Errorf("expected 0 for missing user-id, got %d", id)
	}

	md = metadata.Pairs("user-id", "invalid")
	ctx = metadata.NewIncomingContext(context.Background(), md)
	if id := optionalUserID(ctx); id != 0 {
		t.Errorf("expected 0 for invalid user-id, got %d", id)
	}

	md = metadata.Pairs("user-id", "123")
	ctx = metadata.NewIncomingContext(context.Background(), md)
	if id := optionalUserID(ctx); id != 123 {
		t.Errorf("expected 123, got %d", id)
	}
}

func TestValidateInternalAuth(t *testing.T) {
	ctx := context.Background()
	if err := validateInternalAuth(ctx); err == nil {
		t.Errorf("expected error for missing metadata")
	}

	md := metadata.Pairs("internal-token", "invalid")
	ctx = metadata.NewIncomingContext(context.Background(), md)
	if err := validateInternalAuth(ctx); err == nil {
		t.Errorf("expected error for invalid token")
	}

	md = metadata.Pairs("internal-token", internalGRPCToken())
	ctx = metadata.NewIncomingContext(context.Background(), md)
	if err := validateInternalAuth(ctx); err != nil {
		t.Errorf("unexpected error for valid token: %v", err)
	}
}
