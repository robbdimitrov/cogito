package post

// Server is runing on a port and handling grpc requests
type Server struct {
	port string
}

// NewServer is a constructor for new Server objects
func NewServer(port string) *Server {
	return &Server{port}
}

// Start starts the server instance
func (s *Server) Start() {
	// log.Printf("Starting server on port %s\n", s.port)

	// lis, err := net.Listen("tcp", ":"+s.port)
	// if err != nil {
	// 	log.Fatalf("Server failed to listen: %v", err)
	// }

	// if err := svr.Serve(lis); err != nil {
	// 	log.Fatalf("Server failed to serve: %v", err)
	// }
}
