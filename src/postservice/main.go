package main

import (
	"os"

	_ "github.com/lib/pq"

	"github.com/robbdimitrov/thoughts/src/postservice/post"
)

func main() {
	port := "5050"
	if value := os.Getenv("PORT"); value != "" {
		port = value
	}
	dbURI := os.Getenv("DATABASE_URL")
	authURI := os.Getenv("AUTH_SERVICE_ADDR")
	userURI := os.Getenv("USER_SERVICE_ADDR")

	s := post.NewServer(port, dbURI, authURI, userURI)

	s.Start()
}
