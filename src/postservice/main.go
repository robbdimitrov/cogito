package main

import (
	"fmt"
	"log"
	"net"
	"os"
	"os/signal"

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

	dbClient := post.NewDbClient(dbURL)
	server := post.CreateServer(dbClient)

	go func() {
		log.Printf("Server is starting on port %s", port)
		if err := server.Serve(lis); err != nil {
			log.Fatal(err)
		}
	}()

	quit := make(chan os.Signal)
	signal.Notify(quit, os.Interrupt)
	<-quit

	log.Println("Server is shutting down...")
	server.GracefulStop()
	dbClient.Close()
}
