package post

import (
	"log"
	"net"

	pb "postservice/genproto"

	"google.golang.org/grpc"
)

// Server is runing on a port and handling grpc requests
type Server struct {
	port    string
	dbURI   string
	authURI string
}

// NewServer is a constructor for new Server objects
func NewServer(port string, dbURI string, authURI string) *Server {
	return &Server{port, dbURI, authURI}
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
		log.Fatalf("Server failed to listen: %v", err)
	}

	svr := grpc.NewServer()

	dbClient := s.createDbClient()
	authClient := NewAuthClient(s.authURI)

	pb.RegisterPostServiceServer(svr, NewService(dbClient, authClient))
	pb.RegisterActionServiceServer(svr, NewActionService(dbClient, authClient))

	if err := svr.Serve(lis); err != nil {
		log.Fatalf("Server failed to serve: %v", err)
	}
}
