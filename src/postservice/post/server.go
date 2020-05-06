package post

import (
	"google.golang.org/grpc"

	pb "github.com/robbdimitrov/thoughts/src/postservice/genproto"
)

// CreateServer creates a new grpc server
func CreateServer(dbClient *DbClient) *grpc.Server {
	s := grpc.NewServer()
	c := newController(dbClient)
	pb.RegisterPostServiceServer(s, c)
	pb.RegisterActionServiceServer(s, c)
	return s
}
