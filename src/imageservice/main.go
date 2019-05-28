package main

import (
	"os"

	"imageservice/image"
)

func main() {
	server := image.NewServer(5000,
		os.Getenv("AUTH_URI"))
	server.Start()
}
