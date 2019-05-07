package post

import (
  "fmt"
)

type Server struct {
  port int
  dbUrl string
}

func NewServer(port int, dbUrl string) *Server {
  server := Server{port: port, dbUrl: dbUrl}
  return &server
}

func (server *Server) Start() {
  fmt.Printf("Starting server on port %d\n", server.port)
}
