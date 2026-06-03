package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"time"

	"github.com/robbdimitrov/thoughts/src/apigateway/api"
)

func main() {
	port := "8080"
	if value := os.Getenv("PORT"); value != "" {
		port = value
	}
	authAddr := os.Getenv("AUTH_SERVICE_ADDR")
	postAddr := os.Getenv("POST_SERVICE_ADDR")
	userAddr := os.Getenv("USER_SERVICE_ADDR")
	imageAddr := os.Getenv("IMAGE_SERVICE_ADDR")
	if imageAddr == "" {
		imageAddr = "imageservice:8081"
	}

	handler := api.CreateServer(authAddr, postAddr, userAddr, imageAddr)
	server := &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: handler,
	}

	go func() {
		log.Printf("Server is starting on port %s", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	log.Println("Server is shutting down...")
	if err := server.Shutdown(ctx); err != nil {
		log.Fatal(err)
	}
}
