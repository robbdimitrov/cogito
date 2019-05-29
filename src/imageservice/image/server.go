package image

import (
	"fmt"
	"log"
	"net/http"
)

// Server is runing on a port and handling grpc requests
type Server struct {
	port    string
	authURI string
}

// NewServer is a constructor for new Server objects
func NewServer(port string, authURI string) *Server {
	return &Server{port, authURI}
}

// Start starts the server instance
func (s *Server) Start() {
	log.Printf("Starting server on port %s\n", s.port)

	authClient := NewAuthClient(s.authURI)
	service := Service{"/data/images", authClient}

	http.HandleFunc("/images", service.uploadFile)
	http.HandleFunc("/images/", service.getFile)

	err := http.ListenAndServe(fmt.Sprintf(":%s", s.port), nil)
	if err != nil {
		log.Fatalf("Error prevented the server from running: %v", err)
	}
}
