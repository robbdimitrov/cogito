package post

import (
	"context"

	"google.golang.org/grpc"

	pb "github.com/robbdimitrov/thoughts/src/postservice/genproto"
)

// CreateServer creates a new grpc server
func CreateServer(dbClient *DbClient) *grpc.Server {
	server := grpc.NewServer(grpc.UnaryInterceptor(internalAuthInterceptor))
	controller := newController(dbClient)
	pb.RegisterPostServiceServer(server, controller)
	return server
}

func internalAuthInterceptor(
	ctx context.Context,
	req interface{},
	info *grpc.UnaryServerInfo,
	handler grpc.UnaryHandler,
) (interface{}, error) {
	if err := validateInternalAuth(ctx); err != nil {
		return nil, err
	}
	return handler(ctx, req)
}
