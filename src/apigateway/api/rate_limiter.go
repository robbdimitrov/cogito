package api

import (
	"context"
	"log"
	"os"

	"github.com/jackc/pgx/v4/pgxpool"
)

type PostgresRateLimiterStore struct {
	db    *pgxpool.Pool
	burst int
	rate  float64 // tokens per second
}

func NewPostgresRateLimiterStore(burst int, rate float64) *PostgresRateLimiterStore {
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		log.Println("DATABASE_URL not set, rate limiter will deny all requests")
		return &PostgresRateLimiterStore{burst: burst, rate: rate}
	}

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		log.Fatalf("Unable to parse database URL: %v", err)
	}
	config.MaxConns = 5

	db, err := pgxpool.ConnectConfig(context.Background(), config)
	if err != nil {
		log.Fatalf("Unable to connect to database for rate limiter: %v", err)
	}

	return &PostgresRateLimiterStore{
		db:    db,
		burst: burst,
		rate:  rate,
	}
}

func (s *PostgresRateLimiterStore) Allow(identifier string) (bool, error) {
	if s.db == nil {
		return false, nil
	}

	ctx := context.Background()
	tx, err := s.db.Begin(ctx)
	if err != nil {
		return false, err
	}
	defer tx.Rollback(ctx)

	var tokens int
	var elapsed float64
	err = tx.QueryRow(ctx, "SELECT tokens, EXTRACT(EPOCH FROM now() - last_updated) FROM rate_limits WHERE id = $1 FOR UPDATE", identifier).Scan(&tokens, &elapsed)

	if err != nil {
		// Not found, insert new
		_, err = tx.Exec(ctx, "INSERT INTO rate_limits (id, tokens, last_updated) VALUES ($1, $2, now()) ON CONFLICT (id) DO NOTHING", identifier, s.burst-1)
		if err != nil {
			return false, err
		}
		tx.Commit(ctx)
		return true, nil
	}

	// Calculate new tokens
	newTokens := tokens + int(elapsed*s.rate)
	if newTokens > s.burst {
		newTokens = s.burst
	}

	if newTokens > 0 {
		_, err = tx.Exec(ctx, "UPDATE rate_limits SET tokens = $1, last_updated = now() WHERE id = $2", newTokens-1, identifier)
		if err != nil {
			return false, err
		}
		tx.Commit(ctx)
		return true, nil
	}

	return false, nil
}
