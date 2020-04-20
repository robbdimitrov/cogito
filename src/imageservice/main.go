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
	port := os.Getenv("PORT")
	imageDir := os.Getenv("IMAGE_DIR")

	s := image.CreateServer(port, imageDir)

	go func() {
		log.Printf("Starting server on port %s\n", port)
		if err := s.ListenAndServe(); err != nil {
			log.Fatal(err)
		}
	}()

	quit := make(chan os.Signal)
	signal.Notify(quit, os.Interrupt)
	<-quit
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	log.Println("Shutting down...")
	if err := s.Shutdown(ctx); err != nil {
		log.Fatal(err)
	}
}
