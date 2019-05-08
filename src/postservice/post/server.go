package post

import (
	"fmt"
)

// Server is runing on a port and handling grpc requests
type Server struct {
	port  int
	dbURL string
}

// NewServer is a constructor for new Server objects
func NewServer(port int, dbURL string) *Server {
	server := Server{port, dbURL}
	return &server
}

// Start starts the server instance
func (server *Server) Start() {
	fmt.Printf("Starting server on port %d\n", server.port)
}
