package main

import (
	"context"
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"
	"time"

	"github.com/robbdimitrov/thoughts/src/postservice/post"
)

func main() {
	port := "5050"
	if value := os.Getenv("PORT"); value != "" {
		port = value
	}
	dbURL := os.Getenv("DATABASE_URL")

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		log.Fatal(err)
	}

	d := post.NewDbClient(dbURL)
	s := post.CreateServer(d)

	go func() {
		log.Printf("Server is starting on port %s", port)
		if err := s.Serve(lis); err != nil {
			log.Fatal(err)
		}
	}()

	quit := make(chan os.Signal)
	signal.Notify(quit, os.Interrupt)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Println("Server is shutting down...")
	s.GracefulStop()
	d.Close(ctx)
}
