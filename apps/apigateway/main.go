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

	"cogito/apigateway/api"
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
	flowAddr := os.Getenv("FLOW_SERVICE_ADDR")
	searchAddr := flowAddr
	eventsAddr := flowAddr

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	api.ValidateSecrets()
	handler := api.CreateServer(ctx, authAddr, postAddr, userAddr, imageAddr, searchAddr, eventsAddr)
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

	<-ctx.Done()
	stop()

	shutdownCtx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	slog.Info("server shutting down")
	if err := server.Shutdown(shutdownCtx); err != nil {
		log.Fatal(err)
	}
}
