package main

import (
	"os"

	"github.com/robbdimitrov/thoughts/src/imageservice/image"
)

func main() {
	port := os.Getenv("PORT")
	authURI := os.Getenv("AUTH_SERVICE_ADDR")

	server := image.NewServer(port, authURI)
	server.Start()
}
