package post

import (
	"google.golang.org/grpc"

	pb "github.com/robbdimitrov/thoughts/src/postservice/genproto"
)

// CreateServer creates a new grpc server
func CreateServer(dbClient *DbClient) *grpc.Server {
	server := grpc.NewServer()
	controller := newController(dbClient)
	pb.RegisterPostServiceServer(server, controller)
	return server
}
