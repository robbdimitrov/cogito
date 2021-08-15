package post

import (
	"google.golang.org/grpc"
)

// CreateServer creates a new grpc server
func CreateServer(dbClient *DbClient) *grpc.Server {
	server := grpc.NewServer()
	controller := newController(dbClient)
	RegisterPostServiceServer(server, controller)
	return server
}
