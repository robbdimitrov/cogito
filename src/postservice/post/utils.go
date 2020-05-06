package post

import (
	"context"
	"strconv"

	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/metadata"
	"google.golang.org/grpc/status"
)

func newError(c codes.Code) error {
	return status.Error(c, c.String())
}

func getUserID(ctx context.Context) (int32, error) {
	md, ok := metadata.FromIncomingContext(ctx)
	if !ok {
		return 0, newError(codes.Unauthenticated)
	}
	userID, err := strconv.Atoi(md.Get("user-id")[0])
	if err != nil {
		return 0, err
	}
	return int32(userID), nil
}
