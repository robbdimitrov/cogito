package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"time"

	"github.com/robbdimitrov/thoughts/src/imageservice/image"
)

func main() {
	port := "8080"
	if value := os.Getenv("PORT"); value != "" {
		port = value
	}
	imageDir := os.Getenv("IMAGE_DIR")

	server := image.CreateServer(port, imageDir)

	go func() {
		log.Printf("Server is starting on port %s", port)
		if err := server.ListenAndServe(); err != nil {
			log.Fatal(err)
		}
	}()

	quit := make(chan os.Signal)
	signal.Notify(quit, os.Interrupt)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Println("Server is shutting down...")
	if err := server.Shutdown(ctx); err != nil {
		log.Fatal(err)
	}
}
