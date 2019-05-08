package main

import (
	"os"

	"postservice/post"
)

func main() {
	port, err := os.Getenv("PORT")
	if err != nil {
		port = 50054
	}
	dbURI := os.Getenv("DB_URI")
	server := post.NewServer(port, dbURI)
	server.Start()
}
