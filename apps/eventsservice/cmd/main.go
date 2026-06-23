package main

import (
	"context"
	"fmt"
	"log"
	"log/slog"
	"net"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"time"

	"github.com/jackc/pgx/v4/pgxpool"
	"github.com/twmb/franz-go/pkg/kgo"
	"github.com/valkey-io/valkey-go"

	eventsservice "thoughts/eventsservice"
	"thoughts/eventsservice/internal/feed"
	feedstore "thoughts/eventsservice/internal/feed/store/postgres"
	"thoughts/eventsservice/internal/notifications"
	notificationstore "thoughts/eventsservice/internal/notifications/store/postgres"
)

func main() {
	setupLogger()

	port := envOrDefault("PORT", "5050")
	dbURL := os.Getenv("DATABASE_URL")
	valkeyURL := envOrDefault("VALKEY_URL", "redis://localhost:6379")
	brokers := splitCSV(envOrDefault("REDPANDA_BROKERS", "localhost:9092"))
	threshold := envIntOrDefault("FAN_OUT_THRESHOLD", 10000)
	_ = threshold

	ctx, stop := signal.NotifyContext(context.Background(), os.Interrupt)
	defer stop()

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("parsing database URL: %v", err)
	}
	config.MaxConns = 10
	db, err := pgxpool.ConnectConfig(ctx, config)
	if err != nil {
		log.Fatalf("connecting to database: %v", err)
	}
	defer db.Close()

	valkeyOptions, err := valkey.ParseURL(valkeyURL)
	if err != nil {
		log.Fatalf("parsing valkey URL: %v", err)
	}
	valkeyClient, err := valkey.NewClient(valkeyOptions)
	if err != nil {
		log.Fatalf("initializing valkey client: %v", err)
	}
	defer valkeyClient.Close()

	notifKafka, err := openKafkaClient(brokers, "notifications-consumer")
	if err != nil {
		log.Fatalf("initializing notifications kafka client: %v", err)
	}
	defer notifKafka.Close()

	feedKafka, err := openKafkaClient(brokers, "feed-consumer")
	if err != nil {
		log.Fatalf("initializing feed kafka client: %v", err)
	}
	defer feedKafka.Close()

	go runCleanup(ctx, db)

	notifRepo := notificationstore.NewStore(db)
	feedRepo := feedstore.NewStore(db)
	notifConsumer := notifications.NewConsumer(notifKafka, notifRepo)
	feedConsumer := feed.NewConsumer(feedKafka, feedRepo, feed.NewValkeyFollowerCountCache(valkeyClient), threshold)

	go notifConsumer.Run(ctx)
	go feedConsumer.Run(ctx)

	service := eventsservice.NewService(notifRepo)
	server := eventsservice.CreateServer(service)

	lis, err := net.Listen("tcp", fmt.Sprintf(":%s", port))
	if err != nil {
		log.Fatal(err)
	}

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

func openKafkaClient(brokers []string, groupID string) (*kgo.Client, error) {
	return kgo.NewClient(
		kgo.SeedBrokers(brokers...),
		kgo.ConsumerGroup(groupID),
		kgo.DisableAutoCommit(),
	)
}

func runCleanup(ctx context.Context, db *pgxpool.Pool) {
	t := time.NewTicker(time.Hour)
	defer t.Stop()
	for {
		select {
		case <-t.C:
			cleanupOld(ctx, db)
		case <-ctx.Done():
			return
		}
	}
}

func cleanupOld(ctx context.Context, db *pgxpool.Pool) {
	if _, err := db.Exec(ctx, "DELETE FROM outbox WHERE created < now() - interval '7 days'"); err != nil {
		slog.Warn("outbox cleanup failed", "error", err)
	}
	if _, err := db.Exec(ctx, "DELETE FROM feed WHERE created < now() - interval '30 days'"); err != nil {
		slog.Warn("feed cleanup failed", "error", err)
	}
}

func splitCSV(value string) []string {
	parts := strings.Split(value, ",")
	out := make([]string, 0, len(parts))
	for _, part := range parts {
		part = strings.TrimSpace(part)
		if part != "" {
			out = append(out, part)
		}
	}
	return out
}

func envOrDefault(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func envIntOrDefault(key string, fallback int) int {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.Atoi(value)
	if err != nil {
		return fallback
	}
	return parsed
}

func setupLogger() {
	level := slog.LevelInfo
	if os.Getenv("LOG_LEVEL") == "debug" {
		level = slog.LevelDebug
	}
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})))
}
