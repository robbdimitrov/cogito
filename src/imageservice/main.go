package main

import (
	"os"

	"imageservice/image"
)

func main() {
	server := image.NewServer(os.Getenv("PORT"), os.Getenv("IMAGE_DIR"))
	server.Start()
}
