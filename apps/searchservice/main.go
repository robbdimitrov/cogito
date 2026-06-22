package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net"
	"os"
	"os/signal"

	"github.com/jackc/pgx/v4/pgxpool"

	"thoughts/searchservice/search"
)

func main() {
	setupLogger()

	port := "5050"
	if v := os.Getenv("PORT"); v != "" {
		port = v
	}
	dbURL := os.Getenv("DATABASE_URL")
	meiliHost := os.Getenv("MEILI_HOST")
	if meiliHost == "" {
		meiliHost = "http://localhost:7700"
	}
	meiliMasterKey := os.Getenv("MEILI_MASTER_KEY")

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("parsing database URL: %v", err)
	}
	config.MaxConns = 5

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	db, err := pgxpool.ConnectConfig(ctx, config)
	if err != nil {
		log.Fatalf("connecting to database: %v", err)
	}
	defer db.Close()

	meili, err := search.NewMeiliClient(meiliHost, meiliMasterKey)
	if err != nil {
		log.Fatalf("initializing meilisearch: %v", err)
	}

	go search.RunBackfill(ctx, db, meili)
	go search.Run(ctx, db, meili)

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
