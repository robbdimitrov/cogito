package api

import (
	"context"
	"fmt"
	"log/slog"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/valkey-io/valkey-go"
)

const tokenBucketScript = `
local key = KEYS[1]
local burst = tonumber(ARGV[1])
local rate = tonumber(ARGV[2])
local now = tonumber(ARGV[3])

local data = redis.call('HMGET', key, 'tokens', 'last')
local tokens = tonumber(data[1])
local last = tonumber(data[2])

if tokens == nil then
    tokens = burst
    last = now
end

local elapsed = math.max(0, now - last)
tokens = math.min(burst, tokens + elapsed * rate / 1000)

local retry_ms = 0
local allowed = 0
if tokens >= 1 then
    tokens = tokens - 1
    allowed = 1
else
    retry_ms = math.ceil(1000 / rate)
end

local ttl = math.ceil(burst / rate * 2000)
redis.call('HSET', key, 'tokens', tokens, 'last', now)
redis.call('PEXPIRE', key, ttl)

return {allowed, retry_ms}
`

type RateLimitPolicy struct {
	Name  string
	Burst int
	Rate  float64
}

type RateLimitDecision struct {
	Allowed    bool
	RetryAfter time.Duration
}

type RateLimiterStore interface {
	Allow(ctx context.Context, identifier string, policy RateLimitPolicy) (RateLimitDecision, error)
}

type noopRateLimiterStore struct{}

func (noopRateLimiterStore) Allow(_ context.Context, _ string, _ RateLimitPolicy) (RateLimitDecision, error) {
	return RateLimitDecision{Allowed: true}, nil
}

// swappableStore holds the active store behind a read lock so the background
// retry goroutine can promote it from no-op to real without restarting.
type swappableStore struct {
	mu    sync.RWMutex
	inner RateLimiterStore
}

func (s *swappableStore) set(store RateLimiterStore) {
	s.mu.Lock()
	s.inner = store
	s.mu.Unlock()
}

func (s *swappableStore) Allow(ctx context.Context, identifier string, policy RateLimitPolicy) (RateLimitDecision, error) {
	s.mu.RLock()
	inner := s.inner
	s.mu.RUnlock()
	return inner.Allow(ctx, identifier, policy)
}

type DragonflyStore struct {
	client   valkey.Client
	script   *valkey.Lua
	failOpen bool
}

func newDragonflyStore(url string, failOpen bool) (*DragonflyStore, error) {
	client, err := valkey.NewClient(valkey.ClientOption{InitAddress: []string{parseDragonflyAddr(url)}})
	if err != nil {
		return nil, err
	}
	return &DragonflyStore{
		client:   client,
		script:   valkey.NewLuaScript(tokenBucketScript),
		failOpen: failOpen,
	}, nil
}

// NewDragonflyStore returns a RateLimiterStore backed by Dragonfly. It attempts
// a synchronous connection first so rate limiting is active immediately when
// Dragonfly is available. If the initial attempt fails and RATE_LIMIT_FAIL_OPEN
// is true, it returns a no-op store and promotes it to the real store in the
// background once Dragonfly becomes reachable. If fail-open is false, a startup
// failure is fatal.
func NewDragonflyStore(ctx context.Context) RateLimiterStore {
	url := os.Getenv("DRAGONFLY_URL")
	failOpen := envBool("RATE_LIMIT_FAIL_OPEN", false)

	if store, err := newDragonflyStore(url, failOpen); err == nil {
		return store
	} else if !failOpen {
		slog.Error("unable to connect to dragonfly", "error", err)
		os.Exit(1)
	} else {
		slog.Warn("dragonfly unavailable, rate limiting degraded — retrying in background", "error", err)
	}

	ss := &swappableStore{inner: noopRateLimiterStore{}}

	go func() {
		backoff := time.Second
		for {
			select {
			case <-ctx.Done():
				return
			case <-time.After(backoff):
			}
			store, err := newDragonflyStore(url, failOpen)
			if err != nil {
				slog.Warn("dragonfly retry failed", "error", err, "backoff", backoff)
				if backoff < 30*time.Second {
					backoff *= 2
				}
				continue
			}
			ss.set(store)
			slog.Info("dragonfly rate limiter connected")
			return
		}
	}()

	return ss
}

func parseDragonflyAddr(url string) string {
	addr := url
	if after, ok := strings.CutPrefix(url, "redis://"); ok {
		addr = after
	}
	return addr
}

func (s *DragonflyStore) Allow(ctx context.Context, identifier string, policy RateLimitPolicy) (RateLimitDecision, error) {
	nowMs := time.Now().UnixMilli()
	result := s.script.Exec(ctx, s.client,
		[]string{identifier},
		[]string{
			strconv.Itoa(policy.Burst),
			strconv.FormatFloat(policy.Rate, 'f', -1, 64),
			strconv.FormatInt(nowMs, 10),
		})

	if err := result.Error(); err != nil {
		return RateLimitDecision{Allowed: s.failOpen}, err
	}

	vals, err := result.ToArray()
	if err != nil || len(vals) < 2 {
		return RateLimitDecision{Allowed: s.failOpen}, fmt.Errorf("unexpected script result")
	}

	allowed, _ := vals[0].ToInt64()
	retryMs, _ := vals[1].ToInt64()

	return RateLimitDecision{
		Allowed:    allowed == 1,
		RetryAfter: time.Duration(retryMs) * time.Millisecond,
	}, nil
}

func rateLimitPolicy(r *http.Request) (RateLimitPolicy, bool) {
	if r.Method == http.MethodGet && r.URL.Path == "/" {
		return RateLimitPolicy{}, true
	}
	switch {
	case r.Method == http.MethodPost && (r.URL.Path == "/sessions" || r.URL.Path == "/users" || r.URL.Path == "/uploads"):
		return RateLimitPolicy{Name: "strict", Burst: envInt("RATE_LIMIT_STRICT_BURST", 5), Rate: envFloat("RATE_LIMIT_STRICT_RATE", 0.2)}, false
	case r.Method == http.MethodGet && (r.URL.Path == "/users/search" || r.URL.Path == "/hashtags/search" || r.URL.Path == "/search"):
		return RateLimitPolicy{Name: "typeahead", Burst: envInt("RATE_LIMIT_TYPEAHEAD_BURST", 20), Rate: envFloat("RATE_LIMIT_TYPEAHEAD_RATE", 5)}, false
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
	// Session cookie is HttpOnly and server-issued — stable per-client identity
	// that doesn't collapse to the proxy pod's IP for unauthenticated requests.
	if cookie, err := r.Cookie("session"); err == nil && cookie.Value != "" {
		return policy.Name + ":session:" + cookie.Value
	}
	return policy.Name + ":ip:" + clientIP(r)
}

// clientIP resolves the rate-limit identity from the connection's remote
// address. X-Forwarded-For is intentionally ignored: it is attacker-controlled
// and there is no trusted proxy in front of the gateway.
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
