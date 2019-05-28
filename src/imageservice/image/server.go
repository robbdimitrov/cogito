package image

import (
	"fmt"
	"log"
	"net/http"
)

// Server is runing on a port and handling grpc requests
type Server struct {
	port    int32
	authURI string
}

// NewServer is a constructor for new Server objects
func NewServer(port int32, authURI string) *Server {
	return &Server{port, authURI}
}

// Start starts the server instance
func (s *Server) Start() {
	log.Printf("Starting server on port %d\n", s.port)

	authClient := NewAuthClient(s.authURI)
	service := Service{"/data/images", authClient}

	http.HandleFunc("/images", service.uploadFile)
	http.HandleFunc("/images/", service.getFile)

	err := http.ListenAndServe(fmt.Sprintf(":%d", s.port), nil)
	if err != nil {
		log.Fatalf("Error prevented the server from running: %v", err)
	}
}
