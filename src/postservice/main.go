package main

import (
	"fmt"
	"log"
	"log/slog"
	"net"
	"os"
	"os/signal"

	"github.com/robbdimitrov/thoughts/src/postservice/post"
)

func main() {
	setupLogger()
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
		slog.Info("server starting", "port", port)
		if err := server.Serve(lis); err != nil {
			log.Fatal(err)
		}
	}()

	quit := make(chan os.Signal, 1)
	signal.Notify(quit, os.Interrupt)
	<-quit

	slog.Info("server shutting down")
	server.GracefulStop()
	dbClient.Close()
}

func setupLogger() {
	level := slog.LevelInfo
	if os.Getenv("LOG_LEVEL") == "debug" {
		level = slog.LevelDebug
	}
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})))
}
