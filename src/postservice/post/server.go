package post

import (
	"log"
	"net"

	pb "postservice/genproto"

	"google.golang.org/grpc"
)

// Server is runing on a port and handling grpc requests
type Server struct {
	port  string
	dbURI string
}

// NewServer is a constructor for new Server objects
func NewServer(port string, dbURI string) *Server {
	server := Server{port, dbURI}
	return &server
}

func (s *Server) createDbClient() *DbClient {
	db := NewDatabase(s.dbURI)
	return NewDbClient(db)
}

// Start starts the server instance
func (s *Server) Start() {
	log.Printf("Starting server on port %d\n", s.port)

	lis, err := net.Listen("tcp", s.port)
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	dbClient := s.createDbClient()
	svr := grpc.NewServer()

	pb.RegisterPostServiceServer(svr, NewService(dbClient))
	pb.RegisterActionServiceServer(svr, NewActionService(dbClient))

	if err := svr.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
