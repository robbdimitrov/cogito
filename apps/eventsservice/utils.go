package eventsservice

import (
	"context"
	"crypto/subtle"
	"os"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

const defaultInternalGRPCToken = "dev-internal-grpc-token"

func NewError(c codes.Code) error {
	return status.Error(c, c.String())
}

func ValidateInternalAuth(ctx context.Context) error {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return NewError(codes.Unauthenticated)
	}
	values := md.Get("internal-token")
	if len(values) == 0 || subtle.ConstantTimeCompare([]byte(values[0]), []byte(internalGRPCToken())) != 1 {
		return NewError(codes.Unauthenticated)
	}
	return nil
}

func RequestID(ctx context.Context) string {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return ""
	}
	values := md.Get("x-request-id")
	if len(values) == 0 {
		return ""
	}
	return values[0]
}

func internalGRPCToken() string {
	token := os.Getenv("INTERNAL_GRPC_TOKEN")
	if token == "" {
		return defaultInternalGRPCToken
	}
	return token
}
