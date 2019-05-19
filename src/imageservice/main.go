package main

import (
	"os"

	"imageservice/image"
)

func main() {
	server := image.NewServer(os.Getenv("PORT"))
	server.Start()
}
