package image

import (
	"fmt"
	"log"
	"net/http"
)

// Server is runing on a port and handling grpc requests
type Server struct {
	port      string
	imagePath string
	service   Service
}

// NewServer is a constructor for new Server objects
func NewServer(port string, imagePath string) *Server {
	service := Service{imagePath}
	return &Server{port, imagePath, service}
}

func (s *Server) setupRoutes() {
	fs := http.FileServer(http.Dir(s.imagePath))
	http.Handle("/images/", http.StripPrefix("/images", fs))

	http.HandleFunc("/upload", s.service.uploadFile)
}

// Start starts the server instance
func (s *Server) Start() {
	s.setupRoutes()
	log.Printf("Starting server on port %s\n", s.port)

	err := http.ListenAndServe(fmt.Sprintf(":%s", s.port), nil)
	if err != nil {
		log.Fatalf("Error prevented the server from running: %v", err)
	}
}
