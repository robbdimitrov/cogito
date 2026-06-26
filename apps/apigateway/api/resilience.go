package api

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"sync"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/codes"
	"google.golang.org/grpc/status"
)

type circuitBreaker struct {
	name              string
	failureThreshold  int
	cooldown          time.Duration
	consecutiveErrors int
	state             string
	openedAt          time.Time
	mu                sync.Mutex
}

func newCircuitBreaker(name string) *circuitBreaker {
	return &circuitBreaker{
		name:             name,
		failureThreshold: envInt("CIRCUIT_FAILURE_THRESHOLD", 5),
		cooldown:         time.Duration(envInt("CIRCUIT_COOLDOWN_SECONDS", 30)) * time.Second,
		state:            "closed",
	}
}

func (b *circuitBreaker) allow() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.state != "open" {
		return true
	}
	if time.Since(b.openedAt) >= b.cooldown {
		b.state = "half_open"
		slog.Warn("circuit state changed", "downstream", b.name, "state", b.state)
		return true
	}
	return false
}

func (b *circuitBreaker) success() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.consecutiveErrors = 0
	if b.state != "closed" {
		b.state = "closed"
		slog.Info("circuit state changed", "downstream", b.name, "state", b.state)
	}
}

func (b *circuitBreaker) failure(err error) {
	if !isTransientGRPCError(err) {
		return
	}
	b.failureTransient()
}

func (b *circuitBreaker) failureTransient() {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.consecutiveErrors++
	if b.state == "half_open" || b.consecutiveErrors >= b.failureThreshold {
		b.state = "open"
		b.openedAt = time.Now()
		slog.Warn("circuit state changed", "downstream", b.name, "state", b.state)
	}
}

type retryConfig struct {
	maxAttempts int
	baseBackoff time.Duration
}

func defaultRetryConfig() retryConfig {
	return retryConfig{
		maxAttempts: envInt("GRPC_RETRY_MAX_ATTEMPTS", 3),
		baseBackoff: time.Duration(envInt("GRPC_RETRY_BACKOFF_MS", 100)) * time.Millisecond,
	}
}

func newGatewayClient(addr string, downstream string) (*grpc.ClientConn, error) {
	return newGatewayClientWithBreaker(addr, downstream, newCircuitBreaker(downstream))
}

func newGatewayClientWithBreaker(addr string, downstream string, breaker *circuitBreaker) (*grpc.ClientConn, error) {
	return grpc.NewClient(
		addr,
		insecureCredentials(),
		grpc.WithUnaryInterceptor(resilienceUnaryClientInterceptor(downstream, breaker, defaultRetryConfig())),
	)
}

func resilienceUnaryClientInterceptor(downstream string, breaker *circuitBreaker, cfg retryConfig) grpc.UnaryClientInterceptor {
	return func(ctx context.Context, method string, req any, reply any, cc *grpc.ClientConn, invoker grpc.UnaryInvoker, opts ...grpc.CallOption) error {
		if !breaker.allow() {
			return status.Error(codes.Unavailable, "downstream circuit open")
		}
		attempts := 1
		if isRetryableGRPCMethod(method) {
			attempts = cfg.maxAttempts
		}
		var err error
		for attempt := 1; attempt <= attempts; attempt++ {
			err = invoker(ctx, method, req, reply, cc, opts...)
			if err == nil {
				breaker.success()
				return nil
			}
			if !isTransientGRPCError(err) || attempt == attempts {
				breaker.failure(err)
				return err
			}
			slog.Warn("retrying grpc request", "request_id", requestIDFromContext(ctx), "downstream", downstream, "method", method, "attempt", attempt, "error_kind", status.Code(err).String())
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(time.Duration(attempt) * cfg.baseBackoff):
			}
		}
		breaker.failure(err)
		return err
	}
}

func isRetryableGRPCMethod(method string) bool {
	switch method {
	case "/cogito.AuthService/GetSession",
		"/cogito.AuthService/GetSessions",
		"/cogito.PostService/GetFeed",
		"/cogito.PostService/GetPosts",
		"/cogito.PostService/GetLikedPosts",
		"/cogito.PostService/GetHashtagPosts",
		"/cogito.PostService/GetPost",
		"/cogito.PostService/GetReplies",
		"/cogito.UserService/GetUser",
		"/cogito.UserService/GetUserByUsername",
		"/cogito.UserService/GetFollowing",
		"/cogito.UserService/GetFollowers",
		"/cogito.UserService/SearchUsers",
		"/cogito.ImageService/VerifyUpload",
		"/cogito.SearchService/SearchUsers",
		"/cogito.SearchService/SearchPosts",
		"/cogito.SearchService/SearchHashtags":
		return true
	default:
		return false
	}
}

func isTransientGRPCError(err error) bool {
	switch status.Code(err) {
	case codes.Unavailable, codes.ResourceExhausted, codes.DeadlineExceeded, codes.Aborted:
		return true
	default:
		return false
	}
}

type concurrencyLimiter struct {
	upload   chan struct{}
	read     chan struct{}
	mutation chan struct{}
}

func newConcurrencyLimiter() *concurrencyLimiter {
	return &concurrencyLimiter{
		upload:   make(chan struct{}, envInt("CONCURRENCY_UPLOAD_LIMIT", 8)),
		read:     make(chan struct{}, envInt("CONCURRENCY_READ_LIMIT", 64)),
		mutation: make(chan struct{}, envInt("CONCURRENCY_MUTATION_LIMIT", 24)),
	}
}

func (l *concurrencyLimiter) middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		sem := l.semaphore(r)
		if sem == nil {
			next.ServeHTTP(w, r)
			return
		}
		select {
		case sem <- struct{}{}:
			defer func() { <-sem }()
			next.ServeHTTP(w, r)
		default:
			slog.Warn("concurrency limiter saturated", "request_id", getRequestID(r), "policy", concurrencyPolicy(r))
			jsonError(w, http.StatusServiceUnavailable, "Service unavailable")
		}
	})
}

func (l *concurrencyLimiter) semaphore(r *http.Request) chan struct{} {
	switch concurrencyPolicy(r) {
	case "upload":
		return l.upload
	case "read":
		return l.read
	case "mutation":
		return l.mutation
	default:
		return nil
	}
}

func concurrencyPolicy(r *http.Request) string {
	if r.Method == http.MethodPost && r.URL.Path == "/uploads" {
		return "upload"
	}
	if r.Method == http.MethodGet || r.Method == http.MethodHead {
		if r.URL.Path == "/" {
			return "exempt"
		}
		return "read"
	}
	return "mutation"
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) Unwrap() http.ResponseWriter {
	return r.ResponseWriter
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func (r *statusRecorder) Write(b []byte) (int, error) {
	if r.status == 0 {
		r.status = http.StatusOK
	}
	return r.ResponseWriter.Write(b)
}

func setupLogger() {
	level := slog.LevelInfo
	if os.Getenv("LOG_LEVEL") == "debug" {
		level = slog.LevelDebug
	}
	slog.SetDefault(slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: level})))
}
