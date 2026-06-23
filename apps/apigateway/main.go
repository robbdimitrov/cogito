package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net/http"
	"os"
	"os/signal"
	"time"

	"thoughts/apigateway/api"
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
	searchAddr := os.Getenv("SEARCH_SERVICE_ADDR")
	eventsAddr := os.Getenv("EVENTS_SERVICE_ADDR")

	api.ValidateSecrets()
	handler := api.CreateServer(authAddr, postAddr, userAddr, imageAddr, searchAddr, eventsAddr)
	server := &http.Server{
		Addr:    fmt.Sprintf(":%s", port),
		Handler: handler,
	}

	go func() {
		slog.Info("server starting", "port", port)
		if err := server.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatal(err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	slog.Info("server shutting down")
	if err := server.Shutdown(ctx); err != nil {
		log.Fatal(err)
	}
}
