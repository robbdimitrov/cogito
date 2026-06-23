package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net"
	"os"
	"os/signal"

	"thoughts/searchservice/search"
)

func main() {
	setupLogger()

	port := "5050"
	if v := os.Getenv("PORT"); v != "" {
		port = v
	}
	meiliHost := os.Getenv("MEILI_HOST")
	if meiliHost == "" {
		meiliHost = "http://localhost:7700"
	}
	meiliMasterKey := os.Getenv("MEILI_MASTER_KEY")

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	meili, err := search.NewMeiliClient(meiliHost, meiliMasterKey)
	if err != nil {
		log.Fatalf("initializing meilisearch: %v", err)
	}

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		log.Fatal(err)
	}

	server := search.CreateServer(meili)

	go func() {
		slog.Info("server starting", "port", port)
		if err := server.Serve(lis); err != nil {
			log.Fatal(err)
		}
	}()

	<-ctx.Done()

	slog.Info("server shutting down")
	server.GracefulStop()
}

func setupLogger() {
	level := slog.LevelInfo
	if os.Getenv("LOG_LEVEL") == "debug" {
		level = slog.LevelDebug
	}
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})))
}
