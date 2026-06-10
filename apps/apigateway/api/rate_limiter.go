package api

import (
	"context"
	"errors"
	"log/slog"
	"net"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/jackc/pgx/v4"
	"github.com/jackc/pgx/v4/pgxpool"
)

type RateLimitPolicy struct {
	Name  string
	Burst int
	Rate  float64
}

type RateLimitDecision struct {
	Allowed    bool
	RetryAfter time.Duration
}

type PostgresRateLimiterStore struct {
	db       *pgxpool.Pool
	failOpen bool
}

func NewPostgresRateLimiterStore() *PostgresRateLimiterStore {
	dbURL := os.Getenv("DATABASE_URL")
	failOpen := envBool("RATE_LIMIT_FAIL_OPEN", false)
	if dbURL == "" {
		slog.Warn("database url not set for rate limiter", "fail_open", failOpen)
		return &PostgresRateLimiterStore{failOpen: failOpen}
	}

	config, err := pgxpool.ParseConfig(dbURL)
	if err != nil {
		slog.Error("unable to parse database url", "error", err)
		os.Exit(1)
	}
	config.MaxConns = 5

	db, err := pgxpool.ConnectConfig(context.Background(), config)
	if err != nil {
		slog.Error("unable to connect to database for rate limiter", "error", err)
		os.Exit(1)
	}

	return &PostgresRateLimiterStore{db: db, failOpen: failOpen}
}

func (s *PostgresRateLimiterStore) Allow(ctx context.Context, identifier string, policy RateLimitPolicy) (RateLimitDecision, error) {
	if s.db == nil {
		return RateLimitDecision{Allowed: s.failOpen}, errors.New("rate limiter storage unavailable")
	}

	tx, err := s.db.Begin(ctx)
	if err != nil {
		return RateLimitDecision{}, err
	}
	defer func() { _ = tx.Rollback(ctx) }()

	var tokens int
	var elapsed float64
	err = tx.QueryRow(ctx, "SELECT tokens, EXTRACT(EPOCH FROM now() - last_updated) FROM rate_limits WHERE id = $1 FOR UPDATE", identifier).Scan(&tokens, &elapsed)

	if err != nil {
		if !errors.Is(err, pgx.ErrNoRows) {
			return RateLimitDecision{}, err
		}
		_, err = tx.Exec(ctx, "INSERT INTO rate_limits (id, tokens, last_updated) VALUES ($1, $2, now()) ON CONFLICT (id) DO NOTHING", identifier, policy.Burst-1)
		if err != nil {
			return RateLimitDecision{}, err
		}
		if err := tx.Commit(ctx); err != nil {
			return RateLimitDecision{}, err
		}
		return RateLimitDecision{Allowed: true}, nil
	}

	newTokens := tokens + int(elapsed*policy.Rate)
	if newTokens > policy.Burst {
		newTokens = policy.Burst
	}

	if newTokens > 0 {
		_, err = tx.Exec(ctx, "UPDATE rate_limits SET tokens = $1, last_updated = now() WHERE id = $2", newTokens-1, identifier)
		if err != nil {
			return RateLimitDecision{}, err
		}
		if err := tx.Commit(ctx); err != nil {
			return RateLimitDecision{}, err
		}
		return RateLimitDecision{Allowed: true}, nil
	}

	if err := tx.Commit(ctx); err != nil {
		return RateLimitDecision{}, err
	}
	retryAfter := time.Second
	if policy.Rate > 0 {
		retryAfter = time.Duration(float64(time.Second) / policy.Rate)
	}
	return RateLimitDecision{Allowed: false, RetryAfter: retryAfter}, nil
}

func (s *PostgresRateLimiterStore) Cleanup(ctx context.Context, maxAge time.Duration) error {
	if s.db == nil {
		return nil
	}
	_, err := s.db.Exec(ctx, "DELETE FROM rate_limits WHERE last_updated < now() - ($1 * interval '1 second')", int64(maxAge.Seconds()))
	return err
}

func rateLimitPolicy(r *http.Request) (RateLimitPolicy, bool) {
	if r.Method == http.MethodGet && r.URL.Path == "/" {
		return RateLimitPolicy{}, true
	}
	switch {
	case r.Method == http.MethodPost && (r.URL.Path == "/sessions" || r.URL.Path == "/users" || r.URL.Path == "/uploads"):
		return RateLimitPolicy{Name: "strict", Burst: envInt("RATE_LIMIT_STRICT_BURST", 5), Rate: envFloat("RATE_LIMIT_STRICT_RATE", 0.2)}, false
	case r.Method == http.MethodGet || r.Method == http.MethodHead:
		return RateLimitPolicy{Name: "read", Burst: envInt("RATE_LIMIT_READ_BURST", 120), Rate: envFloat("RATE_LIMIT_READ_RATE", 2)}, false
	default:
		return RateLimitPolicy{Name: "mutation", Burst: envInt("RATE_LIMIT_MUTATION_BURST", 30), Rate: envFloat("RATE_LIMIT_MUTATION_RATE", 1)}, false
	}
}

func rateLimitKey(r *http.Request, policy RateLimitPolicy) string {
	if userID := getUserID(r); userID != "" {
		return policy.Name + ":user:" + userID
	}
	return policy.Name + ":ip:" + clientIP(r)
}

// clientIP resolves the rate-limit identity from the connection's remote
// address. X-Forwarded-For is intentionally ignored: it is attacker-controlled
// and there is no trusted proxy in front of the gateway in local deploys.
func clientIP(r *http.Request) string {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return r.RemoteAddr
	}
	return host
}

func envInt(key string, fallback int) int {
	value, err := strconv.Atoi(os.Getenv(key))
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func envFloat(key string, fallback float64) float64 {
	value, err := strconv.ParseFloat(os.Getenv(key), 64)
	if err != nil || value <= 0 {
		return fallback
	}
	return value
}

func envBool(key string, fallback bool) bool {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	parsed, err := strconv.ParseBool(value)
	if err != nil {
		return fallback
	}
	return parsed
}
