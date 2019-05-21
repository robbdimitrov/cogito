package image

import (
	"fmt"
	"log"
	"net/http"
)

// Server is runing on a port and handling grpc requests
type Server struct {
	port      string
	authURI   string
	imagePath string
}

// NewServer is a constructor for new Server objects
func NewServer(port string, authURI string, imagePath string) *Server {
	return &Server{port, authURI, imagePath}
}

func (s *Server) setupRoutes(service Service) {
	fs := http.FileServer(http.Dir(s.imagePath))
	http.Handle("/images/", http.StripPrefix("/images", fs))

	http.HandleFunc("/upload", service.UploadFile)
}

// Start starts the server instance
func (s *Server) Start() {
	authClient := NewAuthClient(s.authURI)
	service := Service{s.imagePath, authClient}
	s.setupRoutes(service)

	log.Printf("Starting server on port %s\n", s.port)

	err := http.ListenAndServe(fmt.Sprintf(":%s", s.port), nil)
	if err != nil {
		log.Fatalf("Error prevented the server from running: %v", err)
	}
}
