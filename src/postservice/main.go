package main

import (
	"os"

	_ "github.com/lib/pq"

	"postservice/post"
)

func main() {
	port := os.Getenv("PORT")
	dbURI := os.Getenv("DATABASE_URI")
	authURI := os.Getenv("AUTH_SERVICE_ADDR")
	userURI := os.Getenv("USER_SERVICE_ADDR")

	server := post.NewServer(port, dbURI, authURI, userURI)

	server.Start()
}
